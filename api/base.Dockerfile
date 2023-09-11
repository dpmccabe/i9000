FROM python:3.10.4-slim-buster

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update
RUN apt-get install -y libchromaprint-tools ffmpeg

RUN pip install "poetry==1.2.0"
