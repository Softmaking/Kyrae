# Attachment worker: isolated T01 native proof

This directory contains feasibility tests only. It is not a coordinator, queue,
storage implementation, backend integration or production worker. The approved
`assistant-chat-attachments` T01 design/task plan controls scope. G1-dependent
implementation remains blocked; these tests make no Hermes calls.

**Current decoder:** source-built **libheif 1.23.7 + libde265 1.1.3**. The supplied
real original now decodes successfully. Earlier Debian 1.15.1 failures and image
identities remain explicitly historical in `proof-evidence.json`.

## Reproduce current source-built image

Run from the repository root with Docker running. No host Python packages are
needed. Builds download Debian packages and Python wheels inside build stages.
The build context is restricted by `.dockerignore`.

```sh
docker build --progress=plain --platform=linux/arm64 \
  -f apps/attachment-worker/Dockerfile.proof \
  -t kyrae-attachment-worker:t01-modern-arm64 apps/attachment-worker

docker run --rm --pull=never --platform=linux/arm64 \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges:true \
  --network=none --pids-limit=64 --memory=2g --cpus=2 \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=536870912,mode=1777 \
  kyrae-attachment-worker:t01-modern-arm64
```

For amd64, replace `arm64` with `amd64`. Build parallelism is configurable with
`--build-arg CODEC_BUILD_JOBS=6` (allowed range 1–8, default 2); this affects only
compilation, not runtime limits. Modern amd64 builds at 2 and 6 jobs both reached
the terminal's 300-second limit and were cancelled, so no modern amd64 image/pass
is claimed. The recorded earlier distro-stack amd64 evidence remains historical:
native cases passed under emulation, but seccomp setup failed with EINVAL.
Do not remove the filter or increase runtime privileges to obtain a pass.

The JSON output includes per-case outcomes, original hashes, dependency
inventories, loader dependencies and resource observations. Containers are
nonroot UID/GID 65534, have no mounts from the host, published ports or Docker
socket, and are removed after execution. Temporary fixtures are generated in
the bounded `/tmp` tmpfs and removed. No database process is involved.

## What is actually exercised

- In-memory JPEG, PNG and WebP encoding/decoding with Pillow.
- An actual 640 x 480, 8-bit HEVC container, generated using a **build-stage-only**
  pillow-heif encoder. Its wheel/bundled libraries do not enter the final image.
- Source-built `heif-info`, `heif-dec --list-decoders`, loader dependencies and
  explicit `heif-dec -d libde265` decoding to **PNG and JPEG**, checked for
  dimensions and expected red/blue regions. The final image asserts that
  `pillow_heif` is unavailable.
- `.heic` and `.heif` suffixes on **the same real container bytes**. This is not
  independent HEIF fixture coverage and is not a JPEG renamed as HEIC.
- Real scanned PDF and same-page selectable-text + scanned-image PDF.
  Poppler extracts selectable text/bounding boxes and discovers raster-image
  boxes with `pdftohtml -xml -zoom 1`. Pages render at 150 DPI below 8 MP;
  image-region crops are OCRed using Tesseract `eng+spa` with a 15-second
  invocation timeout. Text and image-region locators remain separate in output.
  The Spanish sample is recognized without its accents; this is not evidence
  of comprehensive accented-language accuracy.
- DOCX paragraph/table/header, XLSX value/hidden-sheet/literal-formula and
  missing formula-cache parsing; XML text parsing and external-entity rejection.
- Original file hashes before/after native parsing and conversion, both outside
  and (where supported) inside the parser sandbox. This is local integrity
  evidence, **not** upload/download, durable-storage or gallery retention proof.

## No-proc sandbox

`tests/sandbox_proof.py` uses bubblewrap with `--unshare-all`,
`--new-session`, `--die-with-parent`, `--cap-drop ALL`, a cleared/allowlisted
environment, read-only `/usr`, proof sources and root, a per-job writable bind,
private temporary files on that same 512 MiB outer tmpfs, and an **empty `/proc`
directory**. It does not bind coordinator
`/proc` or mount a fresh proc filesystem. `/etc` is not exposed; Python's loader
uses the explicit `/usr/local/lib` library path.

### Bind-source validation and QA regression

Before any subprocess is launched, the caller must supply an explicit trusted
scratch root. The launcher requires an absolute, parent-traversal-free root
strictly below the fixed container `/tmp` anchor, owned by the current UID and
private to that UID. It uses `lstat` on **every path component**, rejecting
symlinks and non-directories rather than silently canonicalizing aliases with
`resolve()`. Both job bind sources must be directories inside that root; `job/tmp`
must also remain inside the job directory.

`tests/test_sandbox_paths.py` contains 12 regressions, integrated into the
top-level native proof. They cover an actual `job/tmp` symlink to the **existing**
coordinator sentinel directory, job aliases to valid in-root directories, root
and parent-chain aliases, an existing outside-root job, regular-file sources,
parent traversal and an untrusted/nonprivate scratch root. Rejection tests call
the launcher entrypoint and assert its subprocess function was never called.
The valid-path case and the real sandbox launch also pass.

**TOCTOU limitation:** these are pre-launch pathname checks, not descriptor-pinned
binds. A process with the same UID could replace a validated component before
bubblewrap looks it up. This proof uses fresh private directories without a
concurrent hostile writer; it does not establish hostile shared-UID production
isolation. Prior recorded runs also used fresh trusted directories, so the QA
finding does not invalidate their observed native results.

A real libseccomp BPF filter denies socket/connect, ptrace/process-VM access,
mount/umount, unshare and setns syscalls after sandbox setup. Child assertions
check nonroot UID, absent coordinator/persistent/other-job sentinel paths, empty
`/proc`, EPERM for IPv4/IPv6/Unix sockets and ptrace/unshare, and working job
output. The actual native test suite then executes within the same sandbox.
Address space is limited to 1 GiB, CPU to 60 seconds, file output to 2 MiB, and
core dumps are disabled. The sandbox invocation has a 120-second timeout.
Adversarial timeout/process-tree cleanup, OOM, archive bombs and all production
resource-boundary cases are not yet acceptance-tested.

The earlier fresh-proc mount probe failed with EPERM. The no-proc proof succeeds
on arm64 without weakening those container flags. The VM daemon itself reports
an **unconfined outer seccomp profile** (`Seccomp: 0` in the parent); the successful
arm64 child loads its own filter. Compatibility with Docker's standard outer
seccomp filter and the actual deployment host is still pending.

## Local-only real-original compatibility probe

`tests/real_heic_proof.py` accepts only `/input/original.HEIC`. Mount a single
user-authorized file read-only there; never mount its containing directory or
add the photo to the build context. A separate image tag preserves the earlier
synthetic/QA proof image identities:

```sh
docker build --platform=linux/arm64 -f apps/attachment-worker/Dockerfile.proof \
  -t kyrae-attachment-worker:t01-modern-arm64 apps/attachment-worker

docker run --rm --pull=never --platform=linux/arm64 \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges:true \
  --network=none --pids-limit=64 --memory=2g --cpus=2 \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=536870912,mode=1777 \
  --mount "type=bind,source=${PHOTO_SOURCE:?Set the exact authorized local file},target=/input/original.HEIC,readonly" \
  --entrypoint=python kyrae-attachment-worker:t01-modern-arm64 \
  /opt/proof/real_heic_proof.py /input/original.HEIC
```

The parent enforces a 120-second child wall deadline and kills the process group
on timeout. Child CPU/address-space limits are 60 seconds/1 GiB. Before decoding,
the probe checks the inclusive 20 MiB original ceiling and libheif's coded/display
dimensions against 50 MP/16,384 px bounds. It discards native-tool stdout/stderr
and never dereferences libheif's error-message pointer. Only numeric/parser
status and safe facts are reported. Original digests are compared in memory;
neither digests, filenames, EXIF, GPS nor timestamps are emitted.

If header parsing succeeds, it explicitly selects libde265 for PNG/JPEG decode,
compares decoded dimensions to libheif's transformed display dimensions, and
creates aspect-preserving JPEG derivatives within 2,048 px/1 MiB and 320 px/128 KiB.
New pixel-only derivatives omit source EXIF/XMP/ICC/comments; decoded ICC is
converted to sRGB when available. Absent an independently verified color profile,
RGB output does not establish sRGB/HDR fidelity. Dimension consistency is not a
visual-orientation proof. Derivatives exist only on disposable container tmpfs;
none are copied to the repository. This is standalone Linux parser compatibility,
not a real-photo test inside the earlier empty-proc sandbox or a gallery test.

**Current real-original result:** the authorized local file is **751,347 bytes**,
eligible under 20 MiB, with unchanged original integrity. Source-built libheif
1.23.7 / libde265 1.1.3 decoded it successfully with defaults retained: **8-bit
luma/chroma**, **4,032 x 3,024 coded** and **3,024 x 4,032 transformed** dimensions.
PNG and JPEG both match the transformed dimensions; output sizes were
**6,666,399** and **1,180,517 bytes**. PNG/JPEG decode took **3.672/0.513 seconds**;
the full probe exited **0** after **6.218 seconds**. The actual HEVC decode used
the explicitly selected libde265 backend, without an alternative codec or
mandatory-property/error bypass.

The model JPEG is **1,536 x 2,048 / 395,097 bytes** and the thumbnail is
**240 x 320 / 20,585 bytes**. Both meet their respective 2,048 px/1 MiB and
320 px/128 KiB limits, preserve aspect ratio without cropping, and passed checks
for removal of source EXIF/XMP/ICC/comments. The decoded ICC profile was
transformed to sRGB before the pixel-only derivatives were encoded. HDR behavior,
visual/colorimetric fidelity and independently verified visual orientation remain
unproved; matching the library's transformed dimensions is a narrower assertion.

**Historical baseline:** Debian libheif 1.15.1 rejected the same original's
header with error 2 (`Invalid_input`), subcode 0, before any decode. That baseline
exited 1 after 0.503 seconds. It is preserved as the failed compatibility result
that this upgrade fixes, not evidence that the original is corrupt.

A separate, local **read-only macOS `sips` metadata query** returned
**4,032 x 3,024** (within the dimension bounds). That was not a Linux decode or
orientation proof. No macOS conversion or fallback was performed. The original
was never sent to Hermes or any external service.

Six synthetic unit cases passed for byte/dimension bounds, derivative
limits/metadata stripping, safe decoder-error handling, header rejection before
decode with integrity recheck, and supervisor timeout/process-group cleanup.
These tests never open the real photo. Run them without any input mount:

```sh
docker run --rm --pull=never --platform=linux/arm64 \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges:true \
  --network=none --pids-limit=64 --memory=2g --cpus=2 \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=536870912,mode=1777 \
  --entrypoint=python kyrae-attachment-worker:t01-modern-arm64 \
  -m unittest discover -s /opt/proof -p test_real_heic_proof.py -v
```

The safe, anonymous results are in `proof-evidence.json`. No real-photo fixture,
derivative, original filename/path or original hash is recorded there. The real
original compatibility blocker is fixed for arm64. Full G2 and physical-gallery
G3 acceptance remain pending. All 18 unit tests can also be run with
`-m unittest discover -s /opt/proof -p 'test_*.py' -v` in the same constrained image.

## Dependencies, pins and distribution

The Python 3.12 slim-bookworm **multiarchitecture base digest is pinned** in the
Dockerfile. Exact direct runtime apt, source codec and Python versions are pinned. Debian
sources remain the base image's normal bookworm/bookworm-updates/security
repositories; transitive apt versions are inventoried, not snapshot-locked.
Build-stage toolchain packages are inventoried, not version-locked. Python wheel
hashes are not locked. These are reproducible proof instructions,
not a claim of fully reproducible release layers or a completed security audit.

| Dependency | Actual proof version |
| --- | --- |
| Python | 3.12.16 |
| Poppler | 22.12.0-2+deb12u3 |
| Tesseract | 5.3.0-2 |
| English/Spanish trained data | 1:4.1.0-2 each |
| libheif/tools | 1.23.7, official security release, built from verified source |
| libde265 | 1.1.3, official stable release, built from verified source |
| bubblewrap | 0.8.0-2+deb12u1 |
| libseccomp | 2.5.4-1+deb12u1 |
| Pillow / python-docx / lxml | 11.3.0 / 1.2.0 / 6.0.2 |
| openpyxl / defusedxml | 3.1.5 / 0.7.1 |
| Test-only pillow-heif | 1.1.1; bundled libheif 1.20.2, x265 4.1+1-1d117be |

Official metadata was queried at:

- <https://api.github.com/repos/strukturag/libheif/releases/latest>
- <https://api.github.com/repos/strukturag/libde265/releases/latest>

The build fetches the exact official `releases/download/v<version>/` archives,
computes SHA-256, and fails on any mismatch with the published release-asset
digest. Actual verified source pins:

```text
libheif-1.23.7.tar.gz
f7483e818503ea6224c8863e4a56ac02c7089021a98472c811c12aa19faf2475
libde265-1.1.3.tar.gz
554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905
```

These are digest checks, not a claim of independent signature verification.
`build/codecs.py` uses options inspected in the actual pinned CMake sources,
asserts configured cache values, and retains caches, source manifest, builder
package inventory and source license notices in `/usr/local/share/codec-proof`.
Observed toolchain: GCC/G++ **12.2.0-14+deb12u1**, CMake **3.25.1-1**, Ninja
**1.11.1-2~deb12u1**, pkg-config **1.8.1-1**.

`WITH_LIBDE265=ON`, `WITH_LIBDE265_PLUGIN=OFF`, `ENABLE_PLUGIN_LOADING=OFF` select
the sole built-in HEVC decoder. Experimental/uncompressed/WebCodecs and all
optional external decoders/encoders are explicitly disabled, including
x265/x264/kvazaar, AOM/dav1d/SVT/rav1e, OpenH264, VVC, OpenJPEG and FFmpeg.
JPEG/PNG libraries are used by the output tools, not as HEIF codec plugins.
Upstream's internal mask helper remains part of libheif core (no separate CMake
disable option); it is not an HEVC/AV1 encoder. No encoder CLI or codec-builder
toolchain is copied into the final image.

The old apt libheif/libde265 packages are removed from the recipe. The new tools
and explicit ctypes loader use `/usr/local`; `ldd` verifies the actual minimal
libheif graph: libde265, libstdc++, libm, libgcc, libc and the loader. There are no
x265, AOM, dav1d, x264 or FFmpeg dependencies, and no old distro codec libraries.
Only `heif-dec`/`heif-info` are shipped, not the old `heif-convert` alias.

Upstream security limits remain enabled. `build/security_probe.cc`, compiled
against the pinned headers, checks finite default image/tile/item/block/total
memory limits, then **tightens** the context pixel limit to 100 and verifies that
the synthetic 640 x 480 fixture fails with `Security_limit_exceeded`. This runs
both outside and inside the arm64 sandbox. No unlimited/ignore-security option
or property-validation bypass is used. This targeted check and the official
security release do not constitute an exhaustive vulnerability/fuzz audit.

Runtime apt copyright/source-license notices are retained in
`/usr/share/doc/<package>/copyright`; codec source notices are retained in
`/usr/local/share/codec-proof`. Earlier inspected notices include LGPL/GPL and
per-file permissive terms for libheif/libde265 and GPL terms for Poppler,
Apache-2.0 for Tesseract/trained data, LGPL terms for bubblewrap/libseccomp.
These are package-source notices, not a determination that each listed license
applies to every binary. Source/notice and HEVC distribution obligations require
release review. Changelogs were not present at the inspected paths; no patch
audit is claimed. English, Spanish and OSD trained-data files measured
4,113,088, 2,294,433 and 10,562,727 bytes respectively.

## Recorded outcome and remaining G2 gates

`proof-evidence.json` records the observed builds, case outcomes and measurements.
It is a focused T01 evidence summary, not shared SDD approval or QA acceptance.

- **Current source-built arm64:** all nine top-level native cases pass, including
  security-limit behavior, 12 path regressions and the seven native cases rerun
  inside the filtered no-proc sandbox. All 18 standalone unit regressions pass;
  the real-original compatibility/derivative probe also passes.
- **Historical amd64 under emulation, before the fix:** build and all seven native
  cases passed; sandbox failed at `prctl(PR_SET_SECCOMP)` with EINVAL. No bypass
  was used. This image was not rebuilt or retested for the path fix. Native amd64
  host isolation remains untested.
- **G2 remains pending:** actual target-host sandbox, standard outer seccomp
  compatibility, completed modern amd64 build/native-host isolation, additional
  real HEIC/HEIF orientation/10-bit/HDR/sequence fixtures and full security review,
  complex mixed-region overlap/deduplication, adversarial resource-limit and
  isolation tests, and release-level footprint/security/distribution validation.
- **G3 remains pending:** physical gallery original-byte retention, Android
  selection/save-share and remaining coverage confirmation. No devices were
  accessed by this proof.

Measurements apply only to these small synthetic fixtures in a Docker Desktop
Linux VM. RSS values are per-process high-water marks, not total simultaneous
container RSS. Scratch is the measured end-of-run file sum, not peak tmpfs usage.
Recorded image sizes are Docker-reported sizes and gzip-compressed Docker exports,
not an independently measured registry compressed-layer sum. Emulated amd64
timings are not native amd64 capacity estimates.
