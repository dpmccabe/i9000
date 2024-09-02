from __future__ import annotations

import itertools
from hashlib import sha1

import acoustid
import pandas as pd
from botocore.client import BaseClient
from botocore.exceptions import ClientError
from fastapi import HTTPException
from fastapi.logger import logger
from mutagen import File as Mp3File
from mutagen.easyid3 import EasyID3

# ID3 tag names that can be edited by EasyID3
editable_tags = EasyID3.valid_keys.keys()

# ID3 tag names I actually use
relevant_tags = [
    "album",
    "compilation",
    "composer",
    "title",
    "artist",
    "albumartist",
    "discnumber",
    "tracknumber",
    "genre",
    "date",
]


def fingerprint_track(f: str) -> dict[str, str | int]:
    """
    get the AcoustID of an mp3 file and other file attributes unrelated to ID3 tags

    Parameters
    ----------
    f : str
        path to mp3 file

    Returns
    -------
    dict[str, str | int]
        a dictionary containing an AcoustID, track duration, and bitrate
    """

    # this is a good time to get the bitrate since it's not available via ID3 tags
    logger.info("Reading with mutagen...")
    mut = Mp3File(f)
    bitrate = round(mut.info.bitrate / 1000)

    # fingerprint 30s of audio
    logger.info("Fingerprinting...")
    duration_fingerprint = acoustid.fingerprint_file(f, maxlength=30)

    # using a one-row data frame for consistency with legacy fingerprinting method
    tracks_to_fp = pd.DataFrame([{"path": f}], index=None)
    tracks_to_fp[["duration", "fingerprint"]] = duration_fingerprint
    tracks_to_fp["duration"] = tracks_to_fp["duration"].astype("Float64")
    tracks_to_fp["fingerprint"] = [x.decode() for x in tracks_to_fp["fingerprint"]]
    tracks_to_fp["fingerprint"] = tracks_to_fp["fingerprint"].astype("string")

    # use AcoustID fingerprint and the duration to construct persistent ID (handles the
    # case where an extended version of an existing track has the same initial 30s of
    # audio) using sha1 hash (good enough since no need for cryptographic security)
    tracks_to_fp = tracks_to_fp.assign(
        hash=tracks_to_fp[["duration", "fingerprint"]]
        .apply(lambda x: sha1(x.to_json().encode()).hexdigest(), axis=1)
        .astype("string")
    )

    tid = tracks_to_fp["hash"].values[0]
    logger.info(f"id := {tid}")

    return {
        "id": tid,
        "duration": tracks_to_fp["duration"].values[0],
        "bitrate": bitrate,
    }


def check_file_exists(s3_client: BaseClient, bucket: str, perm_key: str) -> bool:
    """
    check if an mp3 file has previously been imported and saved on S3 already

    Parameters
    ----------
    s3_client : BaseClient
    bucket : str
    perm_key : str
        object key of permanent file (i.e. not the one in the "incoming" folder)

    Returns
    -------
    bool
        true if file already exists on S3
    """

    already_exists = True

    try:
        s3_client.head_object(Bucket=bucket, Key=perm_key)
        logger.info(f"{perm_key} already exists")
    except ClientError as err:
        if err.response["ResponseMetadata"]["HTTPStatusCode"] == 404:
            already_exists = False
        else:
            logger.error(err)
            raise HTTPException(
                status_code=400, detail=err.response["Error"]["Message"]
            )

    return already_exists


def extract_id3_tags(temp_f: str) -> dict[str, str]:
    """
    get ID3 tags for local file

    Parameters
    ----------
    temp_f : str
        path to mp3 file on local filesystem

    Returns
    -------
    dict[str, str]
        a dictionary of ID3 tag names and values
    """

    logger.info("Reading ID3 tags...")
    clean_tags = {}

    try:
        tags = EasyID3(temp_f)

        for tag, val_list in tags.items():
            if tag in relevant_tags:
                # get value from (maybe) single-item list
                val = list(itertools.chain(*[val_list]))[0]

                if len(val) > 0:
                    clean_tags[tag] = val.replace("\x92", "'")

    except Exception as e:
        logger.error(e)

    return clean_tags


def copy_incoming_file(
    s3_client: BaseClient, bucket: str, incoming_key: str, perm_key: str
) -> None:
    """
    copy mp3 file on S3 from incoming/ to a permanent location, then delete the incoming
    version

    Parameters
    ----------
    s3_client : BaseClient
    bucket : str
    incoming_key : str
        S3 object key for mp3 file in incoming/
    perm_key : str
        S3 object key for permanent location of mp3 file

    Returns
    -------
    None
    """

    logger.info(f"Copying {incoming_key} to {perm_key}...")
    s3_client.copy_object(
        Bucket=bucket,
        Key=perm_key,
        CopySource={"Bucket": bucket, "Key": incoming_key},
    )

    logger.info(f"Deleting {incoming_key}...")
    s3_client.delete_object(Bucket=bucket, Key=incoming_key)


def update_id3_tags(temp_f: str, updated_tags: dict[str, str]) -> None:
    """
    update ID3 tags for mp3 file on local filesystem

    Parameters
    ----------
    temp_f : str
        path to mp3 file on local filesystem
    updated_tags :
        a dictionary of new/updated ID3 tag names and values

    Returns
    -------
    None
    """

    current_tags = EasyID3(temp_f)

    for tag, val in updated_tags.items():
        if tag not in editable_tags:
            raise HTTPException(status_code=400, detail=f"Tag {tag} is not an ID3 tag")

        elif val is None or val == "":
            # remove the tag from the mp3 file
            if tag in current_tags:
                logger.info(f"Deleting {tag}...")
                del current_tags[tag]
            else:
                logger.info(f"{tag} is already blank")

        else:
            # tag is new or updated
            logger.info(f"Setting {tag} to '{val}'")
            current_tags[tag] = str(val)

    logger.info("Saving tags..." )
    current_tags.save()
