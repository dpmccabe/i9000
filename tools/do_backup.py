import os
import re
from glob import glob
from unicodedata import normalize

import pandas as pd
import psycopg2
from dotenv import load_dotenv
from unidecode import unidecode


load_dotenv()


pd.set_option("display.max_rows", 60)
pd.set_option("display.max_columns", 50)
pd.set_option("display.max_colwidth", 50)
pd.set_option("display.width", 130)
pd.set_option("mode.chained_assignment", "raise")


print("Getting tracks from DB...")
with psycopg2.connect(os.environ["DATABASE_URL"]) as conn:
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

tracks = tracks.convert_dtypes()

mp3s_folder = os.path.join(os.environ["BACKUP_PATH"], "mp3s")
music_folder = os.path.join(os.environ["BACKUP_PATH"], "music")
print(f"Getting contents of {mp3s_folder}")

mp3_files = pd.DataFrame(glob(f"{mp3s_folder}/*.mp3"), columns=["path"], dtype="string")
mp3_files["id"] = mp3_files["path"].str.extract("([0-9 a-f]{40})")

missing_files = tracks.loc[~tracks["id"].isin(mp3_files["id"])]

if len(missing_files) > 0:
    raise ValueError("Missing files:", missing_files)

missing_tracks = mp3_files.loc[~mp3_files["id"].isin(tracks["id"])]

if len(missing_tracks) > 0:
    raise ValueError("Missing track records:", missing_tracks["id"])


def safe_path_text(x: str) -> str:
    x = re.sub(r"[\\/:*?\"<>|]", "_", x)
    x = x.strip()
    x = re.sub(r"^\.+", "_", x)
    x = normalize("NFKD", x)
    return x


def make_sym_path(r: pd.Series) -> str:
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


print("Constructing symlink paths...")

tracks = tracks.join(
    tracks.groupby(["album_artist", "album"])["track_i"].max(),
    on=["album_artist", "album"],
    rsuffix="_max",
)

tracks["mp3_path"] = mp3s_folder + "/" + tracks["id"] + ".mp3"
tracks["sym_path"] = tracks.apply(make_sym_path, axis=1)
tracks = tracks.drop(columns="track_i_max")

print(f"Getting contents of {music_folder}")
existing_symlink_files = glob(f"{music_folder}/**/*.mp3", recursive=True)
linked_tracks = [os.readlink(x) for x in existing_symlink_files]
existing_symlinks = pd.DataFrame(
    {"sym_path": existing_symlink_files, "mp3_path": linked_tracks}, dtype="string"
)

links_to_remove = existing_symlinks.loc[
    ~existing_symlinks["sym_path"].isin(tracks["sym_path"])
]
print(len(links_to_remove), "links to remove")

for sym_path in links_to_remove["sym_path"].values:
    os.unlink(sym_path)

tracks_to_link = tracks.loc[~tracks["sym_path"].isin(existing_symlinks["sym_path"])]
print(len(tracks_to_link), "tracks to link")

for r in tracks_to_link[["sym_path", "mp3_path"]].itertuples(index=False):
    sym_dir = os.path.dirname(r.sym_path)

    if not os.path.exists(sym_dir):
        os.makedirs(sym_dir)

    os.symlink(r.mp3_path, r.sym_path)

print("Cleaning up empty folders...")
for (dirpath, dirnames, filenames) in os.walk(music_folder):
    if len(dirnames) == 0 and len(filenames) == 0:
        print(dirpath)
        os.removedirs(dirpath)

print(f"Getting contents of {music_folder}")
folder_names = glob(f"{music_folder}/*/*", recursive=True)

folder_names_df = pd.DataFrame({"path": folder_names}, dtype="string")
folder_names_df["path_norm"] = folder_names_df["path"].apply(
    lambda x: unidecode(x).lower()
)

fn_counts = folder_names_df["path_norm"].value_counts()
fn_counts = fn_counts[fn_counts > 1]

if len(fn_counts) > 0:
    print("Duplicate folders:")
    print(fn_counts)

print("Done.")
