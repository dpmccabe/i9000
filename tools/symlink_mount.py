import os

import pandas as pd
from dotenv import load_dotenv

from utils import get_tracks, make_sym_path

load_dotenv()


pd.set_option("display.max_rows", 60)
pd.set_option("display.max_columns", 50)
pd.set_option("display.max_colwidth", 50)
pd.set_option("display.width", 130)
pd.set_option("mode.chained_assignment", "raise")

mp3s_folder = os.environ["MOUNT_PATH"]
music_folder = os.environ["MUSIC_PATH"]

excluded_genres = os.environ["EXCLUDED_GENRES"].split("|")
excluded_album_artists = os.environ["EXCLUDED_ALBUM_ARTISTS"].split("|")
excluded_albums = os.environ["EXCLUDED_ALBUMS"].split("|")

print("Getting tracks from DB...")
tracks = get_tracks(os.environ["DATABASE_URL"])

tracks = tracks.loc[
    ~(
        tracks["genre"].isin(excluded_genres)
        | tracks["album_artist"].isin(excluded_album_artists)
        | tracks["album"].isin(excluded_albums)
    )
]

print("Constructing symlink paths...")
tracks = tracks.join(
    tracks.groupby(["album_artist", "album"])["track_i"].max(),
    on=["album_artist", "album"],
    rsuffix="_max",
)

tracks["mp3_path"] = mp3s_folder + "/" + tracks["id"] + ".mp3"
tracks["sym_path"] = tracks.apply(make_sym_path, axis=1, music_folder=music_folder)

for r in tracks[["sym_path", "mp3_path"]].itertuples(index=False):
    sym_dir = os.path.dirname(r.sym_path)

    if not os.path.exists(sym_dir):
        os.makedirs(sym_dir)

    os.symlink(r.mp3_path, r.sym_path)
