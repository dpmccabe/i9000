from __future__ import annotations

import base64
import os
import time

import psycopg2
import pylast
from botocore.exceptions import ClientError
from fastapi import Depends, FastAPI, HTTPException
from fastapi.logger import logger
from fastapi.openapi.models import APIKey
from fastapi.responses import JSONResponse

from utils import mb as mb_utils
from utils import schemas
from utils import tracks as track_utils
from utils.api import ApiConfig, get_api_key
from utils.cf_signed_url import make_signed_wildcard_url
from utils.tracks import do_clean_tmp_mp3s_dir

app = FastAPI()
config = ApiConfig(app)


@app.get("/")
def health_check() -> str:
    """
    confirm API is still up

    Returns
    -------
    str
    """

    return "OK"


@app.post("/log-in", response_class=JSONResponse)
async def log_in(body: schemas.Auth) -> dict[str, str]:
    """
    log in to API using username and password and return various credentials the
    front-end needs

    Parameters
    ----------
    body : schemas.Auth

    Returns
    -------
    dict[str, str]
    """

    if (
        body.username == os.environ["USERNAME"]
        and body.password == os.environ["PASSWORD"]
    ):
        return {
            "api_key": os.environ["API_KEY"],
            "graphql_auth_token": os.environ["AUTH_TOKEN"],
            "graphql_url": config.graphql_url,
            "cloudfront_url": make_signed_wildcard_url(
                cloudfront_url=os.environ["CLOUDFRONT_URL"],
                cloudfront_keypair_id=os.environ["CLOUDFRONT_KEYPAIR_ID"],
                cloudfront_private_key=base64.b64decode(
                    os.environ["CLOUDFRONT_PRIVATE_KEY"]
                ).decode("utf8"),
            ),
            "lastfm_username": os.getenv("LASTFM_USERNAME"),
            "do_scrobble": "true"
            if all(
                [
                    os.environ["ENV"] == "prod",
                    os.getenv("LASTFM_API_KEY") is not None,
                    os.getenv("LASTFM_API_SECRET") is not None,
                    os.getenv("LASTFM_SESSION_KEY") is not None,
                    os.getenv("LASTFM_USERNAME") is not None,
                ]
            )  # only submit scrobble in prod
            else "false",
        }
    else:
        raise HTTPException(status_code=403)


@app.post("/tracks/presign", response_class=JSONResponse)
async def presign(
    body: schemas.Import, _api_key: APIKey = Depends(get_api_key)
) -> dict[str, str | dict[str, str]]:
    """
    presign an upload URL for an mp3 file to the incoming/ folder on S3

    Parameters
    ----------
    body : schemas.Import
    _api_key : Depends(get_api_key)

    Returns
    -------
    dict[str, str | dict[str, str]]
        a payload for a presigned file upload to S3
    """

    return config.s3_client.generate_presigned_post(
        config.bucket, f"incoming/{body.filename}", ExpiresIn=60000
    )


@app.post("/tracks/import", response_class=JSONResponse)
async def import_track(
    body: schemas.Import, _api_key: APIKey = Depends(get_api_key)
) -> dict[str, str | int | bool]:
    """
    move an mp3 track in the incoming/ folder on S3 to a permanent location and get its
    ID3 tags and other metadata

    Parameters
    ----------
    body : schemas.Import
    _api_key : Depends(get_api_key)

    Returns
    -------
    dict[str, str | int | bool]
        a dictionary of ID3 tags and other file metadata for the front-end to store in
        the DB
    """

    incoming_key = f"incoming/{body.filename}"

    logger.info(f"Saving {body.filename} to {config.tmp_mp3s_dir}...")
    temp_f = os.path.join(config.tmp_mp3s_dir, body.filename)
    config.s3_client.download_file(config.bucket, incoming_key, temp_f)

    # get ID3 tags and other metadata
    clean_tags = track_utils.extract_id3_tags(temp_f)
    fp_duration = track_utils.fingerprint_track(temp_f)

    tid = fp_duration["id"]
    perm_key = f"mp3s/{tid}.mp3"

    # copy from incoming/ to mp3s/ if not already done
    already_exists = track_utils.check_file_exists(
        config.s3_client, config.bucket, perm_key
    )

    if not already_exists:
        track_utils.copy_incoming_file(
            config.s3_client, config.bucket, incoming_key, perm_key
        )

    return {**fp_duration, **clean_tags, "already_exists": already_exists}


@app.delete("/tracks/{track_id}")
async def delete_track(track_id: str, _api_key: APIKey = Depends(get_api_key)) -> None:
    """
    delete an mp3 file on S3

    Parameters
    ----------
    track_id: str
    _api_key : Depends(get_api_key)

    Returns
    -------
    None
    """

    obj_key = f"mp3s/{track_id}.mp3"

    try:
        logger.info(f"Copying {obj_key} to trash...")
        config.s3_client.copy_object(
            Bucket=config.bucket,
            Key=f"trash/{track_id}.mp3",
            CopySource={"Bucket": config.bucket, "Key": obj_key},
        )

        # can delete copy in incoming/ now
        logger.info(f"Deleting {obj_key}...")
        config.s3_client.delete_object(Bucket=config.bucket, Key=obj_key)

    except ClientError as err:
        if err.response["ResponseMetadata"]["HTTPStatusCode"] == 404:
            logger.info("Not found")
        else:
            logger.info(err)
            raise HTTPException(
                status_code=400, detail=err.response["Error"]["Message"]
            )


@app.post("/tracks/retag")
async def retag_tracks(
    body: schemas.Retag, _api_key: APIKey = Depends(get_api_key)
) -> None:
    """
    download an existing mp3 file from S3, update its ID3 tags, and re-upload it

    Parameters
    ----------
    body : schemas.Retag
    _api_key : Depends(get_api_key)

    Returns
    -------
    None
    """

    try:
        for track_id, updated_tags in body.track_tags.items():
            obj_key = f"mp3s/{track_id}.mp3"

            logger.info(f"Downloading {obj_key} to {config.tmp_mp3s_dir}...")
            temp_f = os.path.join(config.tmp_mp3s_dir, f"{track_id}.mp3")

            if not os.path.isfile(temp_f):
                config.s3_client.download_file(config.bucket, obj_key, temp_f)

            track_utils.update_id3_tags(temp_f, updated_tags)

            logger.info("Reuploading file...")
            config.s3_client.upload_file(
                Filename=temp_f, Bucket=config.bucket, Key=obj_key
            )

    except Exception as err:
        logger.error(err)
        raise HTTPException(status_code=400, detail=str(err))


@app.post("/tracks/scrobble")
async def delete_track(
    body: schemas.Scrobble, _api_key: APIKey = Depends(get_api_key)
) -> None:
    """
    submit a scrobble to last.fm

    Parameters
    ----------
    body : schemas.Scrobble
    _api_key : Depends(get_api_key)

    Returns
    -------
    None
    """

    lastfm = pylast.LastFMNetwork(
        api_key=os.environ["LASTFM_API_KEY"],
        api_secret=os.environ["LASTFM_API_SECRET"],
        session_key=os.environ["LASTFM_SESSION_KEY"],
        username=os.environ["LASTFM_USERNAME"],
    )

    lastfm.scrobble(
        album_artist=body.album_artist,
        artist=body.artist,
        album=body.album,
        track_number=body.track_number,
        title=body.title,
        duration=body.duration,
        timestamp=int(time.time()),
    )

    logger.info(f"Scrobbled '{body.title}'.")


@app.post("/mb/check")
async def mb_check(_api_key: APIKey = Depends(get_api_key)) -> None:
    """
    check MusicBrainz for new releases for the artist that was checked least recently

    Parameters
    ----------
    _api_key : Depends(get_api_key)

    Returns
    -------
    None
    """

    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            # pick an artist and check for new releases
            artist_id, existing_release_ids = mb_utils.get_an_artist_and_releases(cur)
            releases = mb_utils.get_mb_releases(artist_id)

            if len(releases) > 0:
                # there are releases in the MusicBrainz DB
                new_releases = mb_utils.filter_new_releases(
                    artist_id, existing_release_ids, releases
                )

                if len(new_releases) > 0:
                    # there are releases of interest not in DB
                    mb_utils.insert_releases(cur, new_releases)
                    mb_utils.insert_artist_releases(cur, new_releases)

            # check for new artist relationships (e.g. is a member of band X)
            relationships = mb_utils.get_mb_relationships(artist_id)

            if len(relationships) > 0:
                # there are artist relationships in the MusicBrainz DB
                existing_relationships = mb_utils.get_existing_relationships(
                    cur, artist_id
                )
                new_relationships = mb_utils.filter_new_relationships(
                    relationships, existing_relationships
                )

                if len(new_relationships) > 0:
                    # there are artist relationships of interest not in DB
                    mb_utils.insert_relationships(cur, new_relationships)

            # mark artist as checked (i.e. send to back of queue)
            mb_utils.checked_artist(cur, artist_id)

    logger.info("Done.")


@app.post("/clean")
async def clean_tmp_mp3s_dir(_api_key: APIKey = Depends(get_api_key)) -> None:
    """
    clean up temporary mp3s directory

    Parameters
    ----------
    _api_key : Depends(get_api_key)

    Returns
    -------
    None
    """

    do_clean_tmp_mp3s_dir(config.tmp_mp3s_dir, config.tmp_mp3s_max_size)
