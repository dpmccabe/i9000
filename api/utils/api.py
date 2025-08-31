import logging
import os

import boto3
import musicbrainzngs as mb
from botocore.config import Config
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader


class ApiConfig:
    def __init__(self, app: FastAPI):
        """
        configure the API based on the current environment

        Parameters
        ----------
        app : FastAPI
        """

        if os.getenv("ENV") != "prod":
            # get environment from local .env
            load_dotenv()

            import pandas as pd

            # set Pandas options
            pd.set_option("display.max_columns", 30)
            pd.set_option("display.max_colwidth", 50)
            pd.set_option("display.max_info_columns", 30)
            pd.set_option("display.max_info_rows", 20)
            pd.set_option("display.max_rows", 20)
            pd.set_option("display.max_seq_items", None)
            pd.set_option("display.width", 200)
            pd.set_option("expand_frame_repr", True)
            pd.set_option("mode.chained_assignment", "warn")

        # configure root logger
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        )

        # must identify this app to MusicBrainz API
        mb.set_useragent(
            os.environ["MUSICBRAINZ_APP_NAME"],
            os.environ["MUSICBRAINZ_APP_VERSION"],
            os.environ["MUSICBRAINZ_CONTACT"],
        )
        mb.set_format("json")
        mb.set_rate_limit(1, 1)

        self.tmp_mp3s_dir = "/tmp/mp3s"
        self.tmp_mp3s_max_size = int(1e9)  # in bytes
        os.makedirs(self.tmp_mp3s_dir, exist_ok=True)

        self.s3_client = boto3.client(
            "s3",
            region_name="us-east-2",  # should be region available on render.com
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

        # S3 bucket name for mp3 storage
        self.bucket = os.environ["BUCKET_NAME"]

        # restrict orgin of API requests in prod, construct URL for GraphQL endpoint
        if os.environ["ENV"] == "dev":
            origins = ["*"]
            self.graphql_url = os.environ["GRAPHQL_URL"]
        else:
            origins = [
                f"https://{os.environ['DOMAIN_NAME']}",
                f"https://www.{os.environ['DOMAIN_NAME']}",
            ]
            self.graphql_url = f"https://{os.environ['GRAPHQL_HOST']}.onrender.com"

        # add CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["*"],
            allow_headers=["*"],
            allow_credentials=True,
        )


async def get_api_key(
    api_key_header: str = Security(APIKeyHeader(name="X-Api-Key", auto_error=False)),
) -> str:
    """
    raise exception if provided API key in header is invalid, return correct key
    otherwise

    Parameters
    ----------
    api_key_header : str

    Returns
    -------
    str
        the provided API key
    """

    if api_key_header == os.environ["API_KEY"]:
        return api_key_header
    else:
        raise HTTPException(status_code=403)
