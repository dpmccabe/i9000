# syntax=docker/dockerfile:1
FROM m2pcdsm3/python-slim-buster-acoustid:latest

WORKDIR /app

COPY --link poetry.lock .
COPY --link pyproject.toml .
RUN poetry install --without dev

COPY --link utils ./utils
COPY --link main.py .

EXPOSE 10000
CMD ["poetry", "run", "gunicorn", "-b", "0.0.0.0:10000", "-t", "20", "-k", "uvicorn.workers.UvicornWorker", "-w", "5", "main:app"]
