"""Synthetic path-substitution regressions; never invoke bubblewrap."""

import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from sandbox_proof import ScratchPathError, run, validate_bind_sources


class ScratchPathTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="t01-paths-", dir="/tmp")
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name)
        self.root = self.base / "private-root"
        self.root.mkdir(mode=0o700)
        self.job = self.make_job(self.root / "job")

    def make_job(self, path):
        path.mkdir(parents=True)
        (path / "tmp").mkdir()
        return path

    def rejected(self, job, code, root=None):
        # Exercise the launcher entrypoint, not only a validator in isolation.
        # A validation bypass must fail this test instead of reaching bwrap.
        with patch("sandbox_proof.subprocess.run", side_effect=AssertionError("subprocess must not run")) as launch:
            with self.assertRaises(ScratchPathError) as caught:
                run(job, scratch_root=self.root if root is None else root)
            self.assertEqual(caught.exception.code, code)
            launch.assert_not_called()

    def test_valid_private_scratch_sources(self):
        self.assertEqual(validate_bind_sources(self.job, scratch_root=self.root), (self.job, self.job / "tmp"))

    def test_tmp_alias_to_existing_coordinator_sentinel_directory(self):
        target = Path("/private-coordinator")
        self.assertTrue((target / "sentinel").is_file(), "must target the existing coordinator sentinel, not an unknown path")
        (self.job / "tmp").rmdir()
        (self.job / "tmp").symlink_to(target, target_is_directory=True)
        self.rejected(self.job, "SYMLINK_COMPONENT")

    def test_job_alias_even_to_another_valid_in_root_job(self):
        alias = self.root / "job-alias"
        alias.symlink_to(self.job, target_is_directory=True)
        self.rejected(alias, "SYMLINK_COMPONENT")

    def test_symlink_in_job_parent_chain(self):
        parent = self.root / "parent"
        actual = self.make_job(parent / "nested-job")
        alias = self.root / "parent-alias"
        alias.symlink_to(parent, target_is_directory=True)
        self.assertTrue((alias / actual.name / "tmp").is_dir())
        self.rejected(alias / actual.name, "SYMLINK_COMPONENT")

    def test_scratch_root_itself_is_symlink(self):
        alias = self.base / "root-alias"
        alias.symlink_to(self.root, target_is_directory=True)
        self.rejected(alias / "job", "SYMLINK_COMPONENT", root=alias)

    def test_symlink_in_scratch_root_parent_chain(self):
        alias = self.base / "base-alias"
        alias.symlink_to(self.base, target_is_directory=True)
        self.rejected(alias / "private-root" / "job", "SYMLINK_COMPONENT", root=alias / "private-root")

    def test_existing_directory_outside_trusted_root(self):
        outside = self.make_job(self.base / "outside-job")
        self.rejected(outside, "OUTSIDE_SCRATCH_ROOT")

    def test_job_must_be_directory(self):
        file = self.root / "not-a-job"
        file.write_text("synthetic regular file")
        self.rejected(file, "NOT_A_DIRECTORY")

    def test_tmp_must_be_directory(self):
        (self.job / "tmp").rmdir()
        (self.job / "tmp").write_text("synthetic regular file")
        self.rejected(self.job, "NOT_A_DIRECTORY")

    def test_parent_traversal_is_not_silently_normalized(self):
        self.rejected(self.job / ".." / "job", "NONCANONICAL_PATH")

    def test_existing_coordinator_directory_cannot_be_trusted_root(self):
        self.rejected(Path("/private-coordinator"), "UNTRUSTED_SCRATCH_ROOT", root=Path("/private-coordinator"))

    def test_nonprivate_scratch_root(self):
        self.root.chmod(0o755)
        self.rejected(self.job, "SCRATCH_ROOT_NOT_PRIVATE")


def run_path_tests():
    stream = io.StringIO()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ScratchPathTests)
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise AssertionError(stream.getvalue())
    return {"tests_run": result.testsRun, "failures": len(result.failures), "errors": len(result.errors), "coordinator_tmp_alias": "existing sentinel target rejected as SYMLINK_COMPONENT before subprocess", "parent_chain_aliases": "rejected even when target stays within root", "outside_root": "existing directory rejected before subprocess", "race_safety": "pathname checks only; no descriptor-pinned TOCTOU claim"}


if __name__ == "__main__":
    unittest.main()
