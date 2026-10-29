# Production attachment processing worker: coordinator + sandboxed-capability parsers.
# Ships no proof fixtures, no encoder and no pillow-heif runtime dependency.
FROM python:3.12-slim-bookworm@sha256:6dd8b6dab6b3adc7812bab69eca5dbdc1a5cc690ad28306d234ffb4ef8ac9753 AS codec-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ninja-build pkg-config libjpeg62-turbo-dev libpng-dev \
    && rm -rf /var/lib/apt/lists/*
COPY build /build
ARG CODEC_BUILD_JOBS=2
RUN CODEC_BUILD_JOBS=${CODEC_BUILD_JOBS} python /build/codecs.py
RUN mkdir -p /usr/local/share/codec-build && dpkg-query -W > /usr/local/share/codec-build/builder-packages.tsv

FROM python:3.12-slim-bookworm@sha256:6dd8b6dab6b3adc7812bab69eca5dbdc1a5cc690ad28306d234ffb4ef8ac9753 AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OMP_THREAD_LIMIT=1 LD_LIBRARY_PATH=/usr/local/lib
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils=22.12.0-2+deb12u3 \
    tesseract-ocr=5.3.0-2 \
    tesseract-ocr-eng=1:4.1.0-2 tesseract-ocr-spa=1:4.1.0-2 \
    libjpeg62-turbo=1:2.1.5-2 \
    libseccomp2=2.5.4-1+deb12u1 fonts-dejavu-core=2.37-6 \
    && dpkg-query -W > /opt/runtime-packages.tsv \
    && rm -rf /var/lib/apt/lists/*
COPY --from=codec-builder /usr/local/lib/libheif.so.1.23.7 /usr/local/lib/libde265.so.0.2.3 /usr/local/lib/
COPY --from=codec-builder /usr/local/bin/heif-dec /usr/local/bin/heif-info /usr/local/bin/
RUN ldconfig && heif-dec --list-decoders > /dev/null && test ! -e /usr/lib/aarch64-linux-gnu/libheif.so.1 \
    && test ! -e /usr/lib/x86_64-linux-gnu/libheif.so.1
COPY requirements.txt /opt/requirements.txt
RUN pip install --no-cache-dir --only-binary=:all: -r /opt/requirements.txt
COPY src/ /app/src/
ENV PYTHONPATH=/app/src
USER 65534:65534
ENTRYPOINT ["python", "-m", "attachment_worker"]

# Test target: pure unit tests + local e2e scripts (mounted storage not included).
FROM runtime AS test
USER root
RUN pip install --no-cache-dir pytest==8.3.5
COPY tests/ /app/tests/
ENTRYPOINT []
CMD ["python", "-m", "pytest", "/app/tests/test_pure_worker.py", "-q"]
