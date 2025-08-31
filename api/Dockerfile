# syntax=docker/dockerfile:1
FROM m2pcdsm3/python-slim-buster-acoustid:latest@sha256:dbb6befce19da0cc8301302bda3b51255c2c0a8797e5fcf603fd8346a00e7177

WORKDIR /app

COPY --link poetry.lock .
COPY --link pyproject.toml .
RUN poetry install --without dev --no-root

COPY --link utils ./utils
COPY --link main.py .

EXPOSE 10000
CMD [
    "poetry",
    "run",
    "gunicorn",
    "-b", "0.0.0.0:10000",
    "-t", "30",
    "-k", "uvicorn.workers.UvicornWorker",
    "-w", "5",
    "--log-level", "info",
    "main:app"
]
