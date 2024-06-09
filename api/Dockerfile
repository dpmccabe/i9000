# syntax=docker/dockerfile:1
FROM m2pcdsm3/python-slim-buster-acoustid:latest@sha256:dbb6befce19da0cc8301302bda3b51255c2c0a8797e5fcf603fd8346a00e7177

WORKDIR /app

COPY --link poetry.lock .
COPY --link pyproject.toml .
RUN poetry install --without dev --no-root

COPY --link utils ./utils
COPY --link main.py .

CMD ["poetry", "run", "gunicorn", "-t", "5", "-k", "uvicorn.workers.UvicornWorker", "-w", "1", "main:app"]
