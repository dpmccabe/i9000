FROM public.ecr.aws/lambda/python:3.10

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install only required build tools, extract ffmpeg, clean aggressively
RUN yum --setopt=install_weak_deps=False install -y tar xz curl && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
    | tar -xJ && \
    mv ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg && \
    mv ffmpeg-*-static/ffprobe /usr/local/bin/ffprobe && \
    rm -rf ffmpeg-*-static && \
    curl -L -o /usr/local/bin/fpcalc \
      https://github.com/acoustid/chromaprint/releases/download/v1.5.1/chromaprint-fpcalc-1.5.1-linux-x86_64 && \
    chmod +x /usr/local/bin/fpcalc && \
    yum remove -y tar xz && \
    yum clean all && \
    rm -rf /var/cache/yum /root/.cache

# Install Poetry (no cache)
RUN pip install --no-cache-dir "poetry==1.8.3"

WORKDIR ${LAMBDA_TASK_ROOT}

COPY poetry.lock .
COPY pyproject.toml .

RUN poetry config virtualenvs.create false && \
    poetry install --without dev --no-root --no-cache && \
    rm -rf /root/.cache/pypoetry /root/.cache/pip

COPY utils ./utils
COPY main.py .

CMD ["main.handler"]
