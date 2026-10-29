"""Narrow no-/proc bubblewrap compatibility probe, with a real seccomp filter."""

import ctypes
import errno
import json
import os
from pathlib import Path
import resource
import stat
import subprocess


def limits():
    resource.setrlimit(resource.RLIMIT_AS, (1024**3, 1024**3))
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
    resource.setrlimit(resource.RLIMIT_FSIZE, (2 * 1024**2, 2 * 1024**2))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


class ScratchPathError(ValueError):
    """A bind source violates the proof's trusted-scratch path policy."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


def checked_directory(path):
    """Inspect every component without resolving or following symlink aliases.

    This is a pre-launch pathname check, not a descriptor-based race defense.
    The proof assumes its freshly created private scratch tree is not mutated
    by another process between these checks and bubblewrap's path lookup.
    """
    path = Path(path)
    if not path.is_absolute() or ".." in path.parts:
        raise ScratchPathError("NONCANONICAL_PATH")
    current = Path(path.anchor)
    for part in (None, *path.parts[1:]):
        if part is not None:
            current = current / part
        try:
            mode = current.lstat().st_mode
        except OSError as error:
            raise ScratchPathError("MISSING_OR_INACCESSIBLE_DIRECTORY") from error
        if stat.S_ISLNK(mode):
            raise ScratchPathError("SYMLINK_COMPONENT")
        if not stat.S_ISDIR(mode):
            raise ScratchPathError("NOT_A_DIRECTORY")
    return path


def validate_bind_sources(job, *, scratch_root):
    # Only the caller-created private scratch directory beneath the fixed
    # container /tmp anchor is trusted, never an arbitrary caller-named root.
    root = checked_directory(scratch_root)
    if root == Path("/tmp") or not root.is_relative_to(Path("/tmp")):
        raise ScratchPathError("UNTRUSTED_SCRATCH_ROOT")
    metadata = root.lstat()
    if metadata.st_uid != os.geteuid() or stat.S_IMODE(metadata.st_mode) & 0o077:
        raise ScratchPathError("SCRATCH_ROOT_NOT_PRIVATE")
    job = checked_directory(job)
    if job == root or not job.is_relative_to(root):
        raise ScratchPathError("OUTSIDE_SCRATCH_ROOT")
    temporary = checked_directory(job / "tmp")
    if not temporary.is_relative_to(root) or not temporary.is_relative_to(job):
        raise ScratchPathError("OUTSIDE_SCRATCH_ROOT")
    return job, temporary


def run(job, *, scratch_root):
    # Reject substitutions before loading seccomp or spawning any subprocess.
    job, temporary = validate_bind_sources(job, scratch_root=scratch_root)
    seccomp = ctypes.CDLL("libseccomp.so.2", use_errno=True)
    seccomp.seccomp_init.argtypes = [ctypes.c_uint32]
    seccomp.seccomp_init.restype = ctypes.c_void_p
    seccomp.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    seccomp.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    seccomp.seccomp_export_bpf.argtypes = [ctypes.c_void_p, ctypes.c_int]
    seccomp.seccomp_release.argtypes = [ctypes.c_void_p]
    context = seccomp.seccomp_init(0x7FFF0000)  # SCMP_ACT_ALLOW
    if not context:
        raise RuntimeError("seccomp_init failed")
    fd = os.memfd_create("proof-seccomp", 0)
    try:
        for name in ("socket", "connect", "ptrace", "process_vm_readv", "process_vm_writev", "mount", "umount2", "unshare", "setns"):
            syscall = seccomp.seccomp_syscall_resolve_name(name.encode())
            if syscall < 0 or seccomp.seccomp_rule_add(context, 0x00050000 | errno.EPERM, syscall, 0) != 0:
                raise RuntimeError(f"cannot filter {name}")
        if seccomp.seccomp_export_bpf(context, fd) != 0:
            raise RuntimeError("seccomp export failed")
        os.lseek(fd, 0, os.SEEK_SET)
        command = [
            "bwrap", "--unshare-all", "--new-session", "--die-with-parent",
            "--cap-drop", "ALL", "--clearenv", "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin",
            "--setenv", "PYTHONDONTWRITEBYTECODE", "1",
            "--setenv", "LD_LIBRARY_PATH", "/usr/local/lib",
            "--setenv", "OMP_THREAD_LIMIT", "1",
            "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin",
            "--symlink", "usr/lib", "/lib",
            "--dir", "/proc", "--bind", str(temporary), "/tmp", "--dir", "/dev",
            "--ro-bind", "/opt/proof", "/proof", "--bind", str(job), "/job",
            "--chdir", "/job", "--remount-ro", "/", "--seccomp", str(fd),
        ]
        if Path("/lib64").exists():
            index = command.index("--remount-ro")
            command[index:index] = ["--symlink", "usr/lib64", "/lib64"]
        command += ["python", "/proof/sandbox_proof.py", "--child"]
        result = subprocess.run(command, pass_fds=(fd,), capture_output=True, text=True, timeout=120, preexec_fn=limits)
        return {"exit": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip(), "proc_policy": "empty /proc; no host proc bind or proc mount"}
    finally:
        seccomp.seccomp_release(context)
        os.close(fd)


def child():
    import socket

    inaccessible = ["/private-coordinator/sentinel", "/persistent-proof/sentinel", "/other-job/sentinel", "/proc/1/environ", "/proc/self/status"]
    for name in inaccessible:
        assert not Path(name).exists(), name
    assert os.getuid() != 0
    assert list(Path("/proc").iterdir()) == []
    scratch = os.statvfs("/tmp")
    assert scratch.f_blocks * scratch.f_frsize == 512 * 1024**2
    try:
        Path("/usr/sandbox-write-probe").write_text("must fail")
    except OSError as error:
        assert error.errno in (errno.EROFS, errno.EACCES)
    else:
        raise AssertionError("runtime unexpectedly writable")
    assert resource.getrlimit(resource.RLIMIT_AS)[0] == 1024**3
    assert resource.getrlimit(resource.RLIMIT_CPU)[0] == 60
    for family in (socket.AF_INET, socket.AF_INET6, socket.AF_UNIX):
        try:
            socket.socket(family)
        except OSError as error:
            assert error.errno == errno.EPERM
        else:
            raise AssertionError("socket unexpectedly allowed")
    libc = ctypes.CDLL(None, use_errno=True)
    assert libc.ptrace(0, 0, 0, 0) == -1 and ctypes.get_errno() == errno.EPERM
    assert libc.unshare(0x10000000) == -1 and ctypes.get_errno() == errno.EPERM
    assert "HOME" not in os.environ
    Path("/job/child-result.txt").write_text("bounded harmless proof output\n")
    print(json.dumps({"uid": os.getuid(), "empty_proc": True, "private_paths_absent": True, "runtime_readonly": True, "scratch_filesystem_bytes": scratch.f_blocks * scratch.f_frsize, "sockets_ptrace_unshare": "EPERM", "rlimits": "AS=1GiB CPU=60s", "job_write": True}))
    # Prove the real tools work in this same restricted filesystem/filter.
    from native_proof import main

    raise SystemExit(main(fixture_root=Path("/job/fixtures"), inside_sandbox=True))


if __name__ == "__main__":
    child()
