"""Local-only real HEIC probe. Never emit content, source names, EXIF or hashes."""

import ctypes
import hashlib
import io
import json
import os
from pathlib import Path
import resource
import signal
import stat
import subprocess
import sys
import tempfile
import time

from PIL import Image, ImageCms

INPUT = Path("/input/original.HEIC")
MAX_ORIGINAL = 20 * 1024**2
MAX_PIXELS = 50_000_000
MAX_SIDE = 16_384
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class SafeFailure(Exception):
    def __init__(self, code, **facts):
        self.code, self.facts = code, facts
        super().__init__(code)


def check_size(size):
    if not 0 < size <= MAX_ORIGINAL:
        raise SafeFailure("ORIGINAL_SIZE_INELIGIBLE", original_bytes=size, limit_bytes=MAX_ORIGINAL)


def check_dimensions(width, height):
    if min(width, height) <= 0 or max(width, height) > MAX_SIDE or width * height > MAX_PIXELS:
        raise SafeFailure("IMAGE_DIMENSIONS_OUT_OF_BOUNDS")


def digest(path):
    with path.open("rb") as stream:
        result = hashlib.sha256()
        for block in iter(lambda: stream.read(128 * 1024), b""):
            result.update(block)
        return result.digest()  # Compared in memory only; never serialized.


class HeifError(ctypes.Structure):
    _fields_ = [("code", ctypes.c_int), ("subcode", ctypes.c_int), ("message", ctypes.c_void_p)]


def header(path):
    library = ctypes.CDLL("/usr/local/lib/libheif.so.1")
    library.heif_context_alloc.restype = ctypes.c_void_p
    library.heif_context_free.argtypes = [ctypes.c_void_p]
    library.heif_context_read_from_file.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_void_p]
    library.heif_context_read_from_file.restype = HeifError
    library.heif_context_get_primary_image_handle.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p)]
    library.heif_context_get_primary_image_handle.restype = HeifError
    library.heif_image_handle_release.argtypes = [ctypes.c_void_p]
    context = library.heif_context_alloc()
    if not context:
        raise SafeFailure("HEADER_ALLOCATION_FAILED")
    handle = ctypes.c_void_p()
    try:
        error = library.heif_context_read_from_file(context, os.fsencode(path), None)
        if error.code:
            # No access to the library's content-bearing error message pointer.
            names = {2: "Invalid_input", 3: "Unsupported_filetype", 4: "Unsupported_feature"}
            raise SafeFailure("LIBHEIF_HEADER_REJECTED", libheif_error_code=error.code, libheif_subcode=error.subcode, libheif_error_name=names.get(error.code, "Other_numeric_error"))
        error = library.heif_context_get_primary_image_handle(context, ctypes.byref(handle))
        if error.code:
            raise SafeFailure("PRIMARY_IMAGE_UNAVAILABLE", libheif_error_code=error.code, libheif_subcode=error.subcode)

        def number(name):
            function = getattr(library, name)
            function.argtypes = [ctypes.c_void_p]
            function.restype = ctypes.c_int
            return function(handle)

        display = [number("heif_image_handle_get_width"), number("heif_image_handle_get_height")]
        coded = [number("heif_image_handle_get_ispe_width"), number("heif_image_handle_get_ispe_height")]
        check_dimensions(*display)
        check_dimensions(*coded)
        profile = number("heif_image_handle_get_color_profile_type")
        profiles = {0: "none", int.from_bytes(b"nclx", "big"): "nclx", int.from_bytes(b"prof", "big"): "ICC", int.from_bytes(b"rICC", "big"): "restricted_ICC"}
        return {"display_dimensions": display, "coded_dimensions": coded, "luma_bits_per_pixel": number("heif_image_handle_get_luma_bits_per_pixel"), "chroma_bits_per_pixel": number("heif_image_handle_get_chroma_bits_per_pixel"), "source_profile_type": profiles.get(profile, "other"), "hdr_status": "unverified"}
    finally:
        if handle.value:
            library.heif_image_handle_release(handle)
        library.heif_context_free(context)


def convert(source, output):
    # The process output may contain private metadata/filenames: discard it all.
    result = subprocess.run(["heif-dec", "-d", "libde265", str(source), str(output)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45)
    if result.returncode:
        raise SafeFailure("LIBHEIF_LIBDE265_CONVERSION_FAILED", decoder_exit=result.returncode)


def bounded_jpeg(image, long_edge, max_bytes):
    current = image.copy()
    current.thumbnail((long_edge, long_edge), Image.Resampling.LANCZOS)
    for _ in range(32):
        for quality in (90, 80, 70, 60, 45, 30):
            stream = io.BytesIO()
            # New pixel-only image: no inherited EXIF, XMP or source ICC payload.
            clean = Image.new("RGB", current.size)
            clean.paste(current)
            clean.save(stream, format="JPEG", quality=quality, optimize=True)
            data = stream.getvalue()
            if len(data) <= max_bytes:
                with Image.open(io.BytesIO(data)) as verified:
                    verified.load()
                    assert not verified.getexif()
                    assert not any(key in verified.info for key in ("exif", "xmp", "icc_profile", "comment"))
                return data, {"dimensions": list(current.size), "bytes": len(data), "long_edge_limit": long_edge, "byte_limit": max_bytes, "metadata_stripped": True, "cropped": False}
        current = current.resize((max(1, int(current.width * 0.8)), max(1, int(current.height * 0.8))), Image.Resampling.LANCZOS)
    raise SafeFailure("DERIVATIVE_BUDGET_UNSATISFIABLE")


def probe():
    report = {"status": "failed", "scope": "local Linux codec compatibility only; no gallery/production sandbox claim", "decoder": "source-built libheif 1.23.7 / explicitly selected built-in libde265 1.1.3", "original_integrity": "not_checked", "linux_dimension_bounds_verified": False, "decode_attempted": False, "orientation": "unverified", "derivative_limits_verified": False}
    before = None
    try:
        metadata = INPUT.lstat()
        if not stat.S_ISREG(metadata.st_mode):
            raise SafeFailure("INPUT_NOT_REGULAR_FILE")
        check_size(metadata.st_size)
        report.update(original_bytes=metadata.st_size, original_20_mib_eligible=True)
        before = digest(INPUT)
        facts = header(INPUT)
        report["header"] = facts
        report["linux_dimension_bounds_verified"] = True
        with tempfile.TemporaryDirectory(prefix="real-heic-", dir="/tmp") as directory:
            work = Path(directory)
            report["decoded"] = {}
            for suffix in ("png", "jpg"):
                output = work / ("decoded." + suffix)
                start = time.monotonic()
                report["decode_attempted"] = True
                convert(INPUT, output)
                with Image.open(output) as image:
                    check_dimensions(*image.size)
                    if list(image.size) != facts["display_dimensions"]:
                        raise SafeFailure("DISPLAY_DIMENSIONS_MISMATCH")
                    image.load()
                report["decoded"][suffix] = {"dimensions": facts["display_dimensions"], "bytes": output.stat().st_size, "wall_seconds": round(time.monotonic() - start, 3)}
            with Image.open(work / "decoded.png") as image:
                image.load()
                icc = image.info.get("icc_profile")
                if icc:
                    rgb = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"), outputMode="RGB")
                    report["color_handling"] = "decoded ICC transformed to sRGB; visual/colorimetric fidelity unverified"
                else:
                    rgb = image.convert("RGB")
                    report["color_handling"] = "RGB derivative; no decoded ICC transform; source sRGB/HDR fidelity unverified"
                for name, edge, ceiling in (("model", 2048, 1024**2), ("thumbnail", 320, 128 * 1024)):
                    data, properties = bounded_jpeg(rgb, edge, ceiling)
                    (work / (name + ".jpg")).write_bytes(data)
                    report[name] = properties
                report["derivative_limits_verified"] = True
            report["orientation"] = {"libheif_transformed_dimensions_match_png_and_jpeg": True, "visual_orientation_verified": False, "independent_original_orientation_metadata_checked": False}
        report["status"] = "pass"
    except SafeFailure as error:
        report.update(error_code=error.code, **error.facts)
    except subprocess.TimeoutExpired:
        report["error_code"] = "DECODER_TIMEOUT"
    except PermissionError:
        report["error_code"] = "INPUT_PERMISSION_DENIED"
    except FileNotFoundError:
        report["error_code"] = "INPUT_OR_TOOL_UNAVAILABLE"
    except Exception:
        # Do not interpolate exception strings from parsers/Pillow/native tools.
        report["error_code"] = "UNEXPECTED_LOCAL_PROOF_FAILURE"
    finally:
        if before is not None:
            try:
                report["original_integrity"] = digest(INPUT) == before
                if not report["original_integrity"]:
                    report.update(status="failed", error_code="ORIGINAL_INTEGRITY_MISMATCH")
            except OSError:
                report.update(status="failed", original_integrity="unavailable", error_code="ORIGINAL_RECHECK_FAILED")
    return report


def child():
    resource.setrlimit(resource.RLIMIT_AS, (1024**3, 1024**3))
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
    resource.setrlimit(resource.RLIMIT_FSIZE, (256 * 1024**2, 256 * 1024**2))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    print(json.dumps(probe()))


def main():
    if sys.argv[1:] == ["--bounded-child"]:
        child()
        return 0
    if sys.argv[1:] != [str(INPUT)]:
        print(json.dumps({"status": "failed", "error_code": "FIXED_INPUT_PATH_REQUIRED"}))
        return 1
    start = time.monotonic()
    process = subprocess.Popen([sys.executable, __file__, "--bounded-child"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, start_new_session=True)
    try:
        output, _ = process.communicate(timeout=120)
        if process.returncode:
            report = {"status": "failed", "error_code": "BOUNDED_CHILD_FAILED", "child_exit": process.returncode}
        else:
            report = json.loads(output)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        report = {"status": "failed", "error_code": "PROOF_WALL_TIMEOUT"}
    except Exception:
        report = {"status": "failed", "error_code": "SAFE_REPORT_UNAVAILABLE"}
    report["wall_seconds"] = round(time.monotonic() - start, 3)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
