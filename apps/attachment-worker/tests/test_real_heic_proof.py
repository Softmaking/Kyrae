"""Synthetic-only boundary/redaction cases; never open the user's photo."""

import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from PIL import Image

from real_heic_proof import INPUT, MAX_ORIGINAL, SafeFailure, bounded_jpeg, check_dimensions, check_size, convert, main, probe


class RealHeicProofTests(unittest.TestCase):
    def test_inclusive_twenty_mib_and_overflow(self):
        check_size(MAX_ORIGINAL)
        with self.assertRaises(SafeFailure):
            check_size(MAX_ORIGINAL + 1)

    def test_dimensions_checked_without_allocating_pixels(self):
        check_dimensions(10000, 5000)
        for dimensions in ((10000, 5001), (16385, 1), (0, 40)):
            with self.subTest(dimensions=dimensions), self.assertRaises(SafeFailure):
                check_dimensions(*dimensions)

    def test_derivative_bounds_aspect_and_metadata(self):
        image = Image.new("RGB", (2400, 1200), "blue")
        image.info.update(exif=b"synthetic-private-marker", xmp=b"synthetic-private-marker", comment=b"synthetic-private-marker")
        for edge, ceiling in ((2048, 1024**2), (320, 128 * 1024)):
            data, facts = bounded_jpeg(image, edge, ceiling)
            self.assertLessEqual(len(data), ceiling)
            self.assertLessEqual(max(facts["dimensions"]), edge)
            self.assertEqual(facts["dimensions"][0], 2 * facts["dimensions"][1])
            self.assertNotIn(b"synthetic-private-marker", data)
            with Image.open(io.BytesIO(data)) as output:
                self.assertFalse(output.getexif())

    def test_tool_failures_do_not_serialize_private_output(self):
        result = subprocess.CompletedProcess([], 2, stdout="private-source-name", stderr="private-exif-marker")
        with patch("real_heic_proof.subprocess.run", return_value=result) as run:
            with self.assertRaises(SafeFailure) as caught:
                convert("private-source-name", "temporary-output")
        self.assertEqual(caught.exception.code, "LIBHEIF_LIBDE265_CONVERSION_FAILED")
        safe = json.dumps(caught.exception.facts)
        self.assertNotIn("private", safe)
        self.assertEqual(run.call_args.kwargs["stdout"], subprocess.DEVNULL)
        self.assertEqual(run.call_args.kwargs["stderr"], subprocess.DEVNULL)

    def test_header_rejection_prevents_conversion_and_rechecks_integrity(self):
        with tempfile.TemporaryDirectory(dir="/tmp") as directory:
            source = Path(directory) / "synthetic-input"
            source.write_bytes(b"synthetic-not-a-photo")
            failure = SafeFailure("LIBHEIF_HEADER_REJECTED", libheif_error_code=2, libheif_subcode=0, libheif_error_name="Invalid_input")
            with patch("real_heic_proof.INPUT", source), patch("real_heic_proof.header", side_effect=failure), patch("real_heic_proof.convert") as decoder:
                report = probe()
        decoder.assert_not_called()
        self.assertEqual(report["status"], "failed")
        self.assertTrue(report["original_integrity"])
        self.assertFalse(report["linux_dimension_bounds_verified"])
        self.assertFalse(report["derivative_limits_verified"])
        self.assertNotIn("synthetic-input", json.dumps(report))

    def test_supervisor_timeout_kills_process_group_without_private_error_output(self):
        process = Mock(pid=12345)
        process.communicate.side_effect = [subprocess.TimeoutExpired("private-source-name", 120), ("", None)]
        output = io.StringIO()
        with patch("real_heic_proof.sys.argv", ["probe", str(INPUT)]), patch("real_heic_proof.subprocess.Popen", return_value=process), patch("real_heic_proof.os.killpg") as kill, patch("sys.stdout", output):
            self.assertEqual(main(), 1)
        kill.assert_called_once()
        self.assertEqual(kill.call_args.args[0], process.pid)
        self.assertEqual(json.loads(output.getvalue())["error_code"], "PROOF_WALL_TIMEOUT")
        self.assertNotIn("private", output.getvalue())


if __name__ == "__main__":
    unittest.main()
