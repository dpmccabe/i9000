from pydantic import BaseModel


class Auth(BaseModel):
    username: str
    password: str


class Import(BaseModel):
    filename: str


class Retag(BaseModel):
    track_tags: dict[str, dict[str, str]]


class Scrobble(BaseModel):
    album_artist: str | None = None
    artist: str
    album: str | None = None
    track_number: int | None = None
    title: str
    duration: int | None = None
