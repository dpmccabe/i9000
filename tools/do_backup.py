import os
from glob import glob

import pandas as pd
from dotenv import load_dotenv
from unidecode import unidecode

from utils import get_tracks, make_sym_path

load_dotenv()


pd.set_option("display.max_rows", 60)
pd.set_option("display.max_columns", 50)
pd.set_option("display.max_colwidth", 50)
pd.set_option("display.width", 130)
pd.set_option("mode.chained_assignment", "raise")


mp3s_folder = os.path.join(os.environ["BACKUP_PATH"], "mp3s")
music_folder = os.path.join(os.environ["BACKUP_PATH"], "music")

print("Getting tracks from DB...")
tracks = get_tracks(os.environ["DATABASE_URL"])

print(f"Getting contents of {mp3s_folder}")
mp3_files = pd.DataFrame(glob(f"{mp3s_folder}/*.mp3"), columns=["path"], dtype="string")
mp3_files["id"] = mp3_files["path"].str.extract("([0-9 a-f]{40})")

missing_files = tracks.loc[~tracks["id"].isin(mp3_files["id"])]

if len(missing_files) > 0:
    raise ValueError("Missing files:", missing_files)

missing_tracks = mp3_files.loc[~mp3_files["id"].isin(tracks["id"])]

if len(missing_tracks) > 0:
    raise ValueError("Missing track records:", missing_tracks["id"])

print("Constructing symlink paths...")
tracks = tracks.join(
    tracks.groupby(["album_artist", "album"])["track_i"].max(),
    on=["album_artist", "album"],
    rsuffix="_max",
)

tracks["mp3_path"] = mp3s_folder + "/" + tracks["id"] + ".mp3"
tracks["sym_path"] = tracks.apply(make_sym_path, axis=1, music_folder=music_folder)
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
