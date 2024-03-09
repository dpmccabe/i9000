import re
from unicodedata import normalize

import pandas as pd
import psycopg2


def get_tracks(db_url: str) -> pd.DataFrame:
    with psycopg2.connect(db_url) as conn:
        tracks = pd.read_sql(
            """
            select
                id,
                album_artist,
                artist,
                album,
                disc_i,
                track_i,
                title,
                year,
                genre,
                compilation
            from tracks
            order by album_artist, album, disc_i, track_i
        """,
            conn,
        )

    return tracks.convert_dtypes()


def safe_path_text(x: str) -> str:
    x = re.sub(r"[\\/:*?\"<>|]", "_", x)
    x = x.strip()
    x = re.sub(r"^\.+", "_", x)
    x = normalize("NFKD", x)
    return x


def make_sym_path(r: pd.Series, music_folder: str) -> str:
    genre = r["genre"]

    genre = re.sub(r"^C:", "Celtic -", genre)
    genre = re.sub(r"^F:", "French -", genre)

    path_parts = [genre, r["album_artist"]]

    if r["album"] is not pd.NA:
        album_parts = []

        if r["year"] is not pd.NA:
            album_parts.append(str(r["year"]))

        album_parts.append(r["album"])
        path_parts.append(" - ".join(album_parts))

    if r["disc_i"] is not pd.NA:
        path_parts.append(f"Disc {r['disc_i']}")

    filename_parts = []

    if r["track_i_max"] is not pd.NA and r["track_i"] is not None:
        if r["track_i_max"] >= 100:
            filename_parts.append(f"{r['track_i']:03d}")
        elif r["track_i_max"] >= 10:
            filename_parts.append(f"{r['track_i']:02d}")
        else:
            filename_parts.append(str(r["track_i"]))

    if r["compilation"]:
        filename_parts.append(r["artist"])

    filename_parts.append(r["title"])

    filename = " - ".join(filename_parts)
    filename += ".mp3"

    path_parts.append(filename)

    path_parts = [safe_path_text(x) for x in path_parts]
    return "/".join([music_folder, *path_parts])
