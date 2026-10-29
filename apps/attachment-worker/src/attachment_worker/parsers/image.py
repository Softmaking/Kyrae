"""Image normalization: HEIC/HEIF/JPEG/PNG/WEBP frames to JPEG/PNG <=1 MiB, <=2048 long edge."""

import io
import os

from ..errors import WorkerError
from . import common
from .tools import run_tool

HEIF = ("image/heic", "image/heif")
JPEG_STEPS = (94, 90, 84, 78, 72, 66, 60)
MAX_LONG_EDGE = 2048
MAX_IMAGE_BYTES = 1024 * 1024
THUMB_EDGE = 320
THUMB_BYTES = 128 * 1024


def parse(request, job, result, deadline):
    media = (request["media_type"] or "").lower()
    source = "input"
    if media in HEIF:
        run_tool(["heif-dec", "-o", "primary.png", "input"], job, 60, 8 * 1024 * 1024)
        source = "primary.png"
    _normalize(job, result, deadline, source)


def _load(job, source):
    from PIL import Image
    with open(os.path.join(job["path"], source), "rb") as stream:
        raw = stream.read()
    try:
        image = Image.open(io.BytesIO(raw))
    except Exception:
        raise WorkerError("ATTACHMENT_CORRUPT") from None
    frames = getattr(image, "n_frames", 1)
    try:
        frames = int(frames)
    except (TypeError, ValueError):
        frames = 1
    image.seek(0)
    image.load()
    return image, frames


def _normalize(job, result, deadline, source):
    from PIL import Image, ImageCms, ImageOps
    image, frames = _load(job, source)
    original = image.size
    if frames > 1:
        result.set_total("frames", frames)
        result.omit(common.image(0), "additional_frames",
                    "Only the primary image frame was processed.")
        result.truncated = True
        result.notice("primary_frame_only", f"{frames} frames were detected; 1 was normalized.")
    pixels = _prepared(image, ImageCms, ImageOps, result)
    if pixels.width * pixels.height > 50_000_000:
        raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
    if max(pixels.size) > MAX_LONG_EDGE:
        divisor = max(pixels.size) / MAX_LONG_EDGE
        resized = pixels.resize((max(1, round(pixels.width / divisor)), max(1, round(pixels.height / divisor))),
                                Image.LANCZOS)
        pixels.close()
        pixels = resized
        result.notice("image_downscaled",
                      f"The image was rescaled from {original[0]}x{original[1]} "
                      f"to {pixels.width}x{pixels.height} pixels within the model image budget.")
    _encode(job, result, pixels, deadline)


def _prepared(image, ImageCms, ImageOps, result):
    try:
        oriented = ImageOps.exif_transpose(image)
    except Exception:
        oriented = image
    if oriented is not image:
        image.close()
    profile = oriented.info.get("icc_profile")
    if not profile:
        return oriented
    try:
        source_profile = ImageCms.ImageCmsProfile(io.BytesIO(profile))
        target_profile = ImageCms.createProfile("sRGB")
        converted = ImageCms.profileToProfile(oriented, source_profile, target_profile, outputMode="RGB")
        oriented.close()
        result.notice("tone_mapped", "Colors were converted from the embedded profile into sRGB.")
        return converted
    except Exception:
        result.notice("parse_warning", "The embedded color profile could not be applied; pixels were kept as-is.")
        return oriented


def _encode(job, result, pixels, deadline):
    from PIL import Image
    common.check_deadline(deadline)
    candidates = _candidates(pixels, Image)
    saved = None
    for compression, image, media in candidates:
        if compression:
            for quality in JPEG_STEPS:
                saved = _write(job, "out-0.jpg", image, "JPEG", quality=quality, ceiling=MAX_IMAGE_BYTES)
                if saved is not None:
                    media = "image/jpeg"
                    break
        else:
            saved = _write(job, "out-0.png", image, "PNG", ceiling=MAX_IMAGE_BYTES)
            if saved is not None:
                media = "image/png"
        if saved is not None:
            result.artifact("image", os.path.basename(saved), media,
                            {"width": pixels.width, "height": pixels.height}, ceiling=MAX_IMAGE_BYTES)
            _thumbnail(job, result, deadline, pixels, Image)
            return
    raise WorkerError("ATTACHMENT_CONVERSION_FAILED")


def _candidates(pixels, Image):
    alpha = pixels.mode in ("RGBA", "LA", "PA") or (pixels.mode == "P" and "transparency" in pixels.info)
    rgb = pixels if pixels.mode == "RGB" else pixels.convert("RGB")
    if alpha:
        flattened = Image.new("RGB", pixels.size, (255, 255, 255))
        flattened.paste(pixels, mask=pixels.convert("RGBA").split()[-1])
        return [("none", pixels, "image/png"), ("steps", flattened, "image/jpeg")]
    return [("steps", rgb, "image/jpeg")]


def _write(job, name, image, fmt, ceiling, quality=0):
    temporary = name + ".new"
    try:
        with open(os.path.join(job["path"], temporary), "wb") as stream:
            if fmt == "JPEG":
                image.save(stream, format=fmt, quality=quality, optimize=True, subsampling=1)
            else:
                image.save(stream, format=fmt)
            stream.flush()
            os.fsync(stream.fileno())
        if os.path.getsize(os.path.join(job["path"], temporary)) > ceiling:
            os.unlink(os.path.join(job["path"], temporary))
            return None
        os.replace(os.path.join(job["path"], temporary), os.path.join(job["path"], name))
    except (OSError, ValueError):
        raise WorkerError("ATTACHMENT_CONVERSION_FAILED", transient=False) from None
    return name


def _thumbnail(job, result, deadline, reference, Image):
    common.check_deadline(deadline)
    edge = THUMB_EDGE / max(reference.size) if max(reference.size) > THUMB_EDGE else 0
    thumb = reference
    if edge:
        thumb = reference.resize((max(1, round(reference.width / edge)), max(1, round(reference.height / edge))),
                                 Image.LANCZOS)
    rgb = thumb if thumb.mode == "RGB" else thumb.convert("RGB")
    for quality in JPEG_STEPS:
        saved = _write(job, "thumb-0.jpg", rgb, "JPEG", ceiling=THUMB_BYTES, quality=quality)
        if saved is not None:
            result.artifact("thumbnail", "thumb-0.jpg", "image/jpeg",
                            {"width": rgb.width, "height": rgb.height}, ceiling=THUMB_BYTES)
            return
    result.notice("parse_warning", "A thumbnail could not be generated for this image.")
