"""Build-stage-only synthetic HEVC fixture; never iPhone/HDR evidence."""

import hashlib
import json
import sys
from pathlib import Path

import pillow_heif
from PIL import Image, ImageDraw

output = Path(sys.argv[1])
output.mkdir()
image = Image.new("RGB", (640, 480), "white")
draw = ImageDraw.Draw(image)
draw.rectangle((20, 20, 280, 440), fill="red")
draw.ellipse((340, 80, 600, 340), fill="blue")
fixture = output / "synthetic-hevc.heic"
pillow_heif.from_pillow(image).save(fixture, quality=90)
# Identical container with another supported suffix, not distinct HEIF coverage.
(output / "synthetic-hevc.heif").write_bytes(fixture.read_bytes())
manifest = {
    "origin": "synthetic Pillow RGB -> test-only pillow-heif HEVC encoder",
    "pillow_heif": pillow_heif.__version__,
    "encoder_libraries": pillow_heif.libheif_info(),
    "dimensions": [640, 480],
    "scope": "8-bit synthetic; no iPhone, orientation, 10-bit, HDR or sequence claim",
    "sha256": hashlib.sha256(fixture.read_bytes()).hexdigest(),
    "bytes": fixture.stat().st_size,
    "heif_suffix_is_same_container": True,
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(json.dumps(manifest))
