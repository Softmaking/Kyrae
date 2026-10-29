"""Bounded subprocess wrappers. Tool output files are data, never logs."""

import os
import subprocess

from ..errors import WorkerError

ENV_KEYS = ("PATH", "LD_LIBRARY_PATH")


def env_for(job_path):
    env = {"PATH": "/usr/local/bin:/usr/bin:/bin", "LC_ALL": "C.UTF-8", "LANG": "C.UTF-8",
           "HOME": job_path, "TMPDIR": job_path, "OMP_THREAD_LIMIT": "1"}
    for key in ENV_KEYS:
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def run_tool(args, job, timeout, output_limit):
    """Run inside the per-job scratch dir; outs/errs are capped files, pipes never held."""
    out_path = err_path = None
    try:
        out = open(os.path.join(job["path"], "tool.out"), "wb")
        err = open(os.path.join(job["path"], "tool.err"), "wb")
        out_path, err_path = out.fileno(), err.fileno()
        try:
            result = subprocess.run(
                args, cwd=job["path"], env=env_for(job["path"]),
                stdin=subprocess.DEVNULL, stdout=out, stderr=err, timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            raise WorkerError("ATTACHMENT_PROCESSING_TIMEOUT") from None
        except OSError:
            raise WorkerError("ATTACHMENT_CODEC_UNAVAILABLE", transient=True) from None
        if result.returncode != 0:
            raise WorkerError("ATTACHMENT_CORRUPT")
    finally:
        if out_path is not None:
            out.close()
        if err_path is not None:
            err.close()
    with open(os.path.join(job["path"], "tool.out"), "rb") as stream:
        data = stream.read(output_limit + 1)
    if len(data) > output_limit:
        raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
    return data


def read_input(job, cap):
    fd = os.open("input", os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=job["fd"])
    chunks, size = [], 0
    try:
        while True:
            chunk = os.read(fd, 128 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > cap:
                raise WorkerError("ATTACHMENT_PROCESSING_LIMIT")
            chunks.append(chunk)
    finally:
        os.close(fd)
    return b"".join(chunks)


def head_input(job, count):
    fd = os.open("input", os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=job["fd"])
    try:
        return os.read(fd, count)
    finally:
        os.close(fd)
