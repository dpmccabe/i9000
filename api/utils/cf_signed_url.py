import base64
import datetime
import json
from urllib.parse import urlencode

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def make_signed_wildcard_url(
    cloudfront_url: str, cloudfront_keypair_id: str, cloudfront_private_key: str
) -> str:
    """
    make a signed Cloudfront URL using a wildcard URL for mp3 files

    Parameters
    ----------
    cloudfront_url : str
    cloudfront_keypair_id : str
    cloudfront_private_key : str

    Returns
    -------
    str
    """

    # allow access to any mp3 file forever
    url = "/".join([cloudfront_url, "*.mp3"])
    expiry_date = datetime.datetime(2300, 1, 1)
    policy = make_policy(url, expiry_date)

    # sign the policy using private key
    signature_bytes = rsa_signer(cloudfront_private_key, policy)
    signature = base64_encode(signature_bytes).decode("utf8")

    # construct the query string
    params = {
        "Policy": base64_encode(policy.encode("utf8")).decode("utf8"),
        "Signature": signature,
        "Key-Pair-Id": cloudfront_keypair_id,
    }

    return "?".join([url, urlencode(params)])


def make_policy(resource: str, expiry_date: datetime.datetime) -> str:
    """
    make a JSON-formatted policy string for a signed Cloudfront URL

    Parameters
    ----------
    resource : str
    expiry_date : datetime

    Returns
    -------
    str
    """

    expiry_timestamp = int(expiry_date.timestamp())

    policy = {
        "Statement": [
            {
                "Resource": resource,
                "Condition": {"DateLessThan": {"AWS:EpochTime": expiry_timestamp}},
            }
        ]
    }

    return json.dumps(policy).replace(" ", "")


def base64_encode(x: bytes) -> bytes:
    """
    base64-encode bytes and replace invalid URL query string characters

    Parameters
    ----------
    x : bytes

    Returns
    -------
    bytes
    """

    return (
        base64.b64encode(x).replace(b"+", b"-").replace(b"=", b"_").replace(b"/", b"~")
    )


def rsa_signer(secret: str, message: str) -> bytes:
    """
    sha1-hash and sign a message using a private key

    Parameters
    ----------
    secret : str
    message : str

    Returns
    -------
    bytes
    """

    private_key = serialization.load_pem_private_key(
        secret.encode(),
        password=None,
        backend=default_backend(),
    )

    return private_key.sign(message.encode("utf8"), padding.PKCS1v15(), hashes.SHA1())
