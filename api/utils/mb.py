from typing import Iterable

import musicbrainzngs as mb
import pandas as pd
from fastapi.logger import logger
from psycopg2._psycopg import cursor

# release group types to save in DB (ignoring audiobooks, bootlegs, etc.)
valid_release_types = {
    "Album",
    "Compilation",
    "EP",
    "Soundtrack",
    "Remix",
    "Demo",
    "Mixtape/Street",
    "Other",
}

valid_artist_rel_types = {
    "member of band": "forward",  # i.e. only "is member of", not "members include"
    "subgroup": None,  # either direcion
    "artist rename": None,
    "founder": "forward",
    "collaboration": "forward",
    "is person": None,
}


def get_an_artist_and_releases(cur: cursor) -> tuple[str, list[str]]:
    """
    get the least recently checked artist's MusicBrains ID and a list of release group
    IDs already stored in dB

    Parameters
    ----------
    cur : cursor

    Returns
    -------
    tuple[str, list[str]]
        a MusicBrainz artist ID and a list of MusicBrainz release group IDs for that
        artist
    """

    # get a single artist ID
    cur.execute(
        """
        select id, name
        from mb_artists
        order by last_checked nulls first
        limit 1;
        """
    )

    artist_id, artist_name = cur.fetchone()
    logger.info(f"Checking: {artist_name} ({artist_id})")

    # get all of their previously stored release group IDs
    cur.execute(
        """
        select mb_release_id
        from mb_artist_releases
        where mb_artist_id=%s
        """,
        (artist_id,),
    )

    existing_release_ids = [r[0] for r in cur.fetchall()]
    logger.info(f"{len(existing_release_ids)} existing releases")
    return artist_id, existing_release_ids


def get_mb_releases(artist_id: str) -> list[dict[str, str | list[str]]]:
    """
    get all release groups by an artist in MusicBrainz

    Parameters
    ----------
    artist_id : str
        a MusicBrainz artist ID

    Returns
    -------
    list[dict[str, str | list[str]]]
         a list of dictionaries containing release group metadata (ID, title, date,
         etc.)
    """

    limit = 100
    offset = 0
    releases = []

    while True:
        rgs = mb.browse_release_groups(artist=artist_id, limit=limit, offset=offset)

        releases.extend(
            [
                {
                    "mb_artist_id": artist_id,
                    "mb_release_id": x["id"],
                    "title": x["title"],
                    "release_date": x["first-release-date"],
                    "type": x["primary-type"],
                    "secondary_types": x["secondary-types"],
                }
                for x in rgs["release-groups"]
            ]
        )

        n = rgs["release-group-count"]

        if offset + limit >= n:
            # no need to continue pagination
            break

        # there are more release groups to get
        offset += limit

    logger.info(f"{len(releases)} unfiltered release groups from MusicBrainz")
    return releases


def filter_new_releases(
    artist_id: str,
    existing_release_ids: list[str],
    releases: list[dict[str, str | list[str]]],
) -> pd.DataFrame:
    """
    filter an artist's release groups to ones with a type in `valid_rel_types` that
    haven't already been stored in the DB

    Parameters
    ----------
    artist_id : str
        a MusicBrainz artist ID
    existing_release_ids : list[str]
        a list of MusicBrainz release group IDs for that artist
    releases : list[dict[str, str | list[str]]]
        all release groups for that artist in MusicBrainz

    Returns
    -------
    list[dict[str, str | list[str]]]
    """

    new_releases = []

    for r in releases:
        if r["mb_release_id"] in existing_release_ids:
            # ignore this release group
            continue

        # release groups should have a type and optional secondary types
        types = {r["type"], *r["secondary_types"]}

        if len(types) == 0 or not valid_release_types.issuperset(types):
            # the release group only has types that aren't in the list of valid types
            continue

        # this is a "new" release to store in the database
        new_releases.append(
            {
                "mb_artist_id": artist_id,
                "mb_release_id": r["mb_release_id"],
                "title": r["title"],
                "release_date": r["release_date"],
                "types": types,
            }
        )

    logger.info(f"{len(new_releases)} new releases")

    # make a data frame
    nr_df = pd.DataFrame(new_releases)
    nr_df = nr_df.convert_dtypes()
    return nr_df


def insert_releases(cur: cursor, releases_df: pd.DataFrame) -> None:
    """
    insert releases (technically, release groups) into database

    Parameters
    ----------
    cur : cursor
    releases_df : pd.DataFrame

    Returns
    -------
    None
    """

    # release groups might belong to multiple artists, so de-dup
    releases_sql = releases_df.copy().drop(columns="mb_artist_id")
    releases_sql = releases_sql.drop_duplicates(subset="mb_release_id")
    releases_sql["release_date"] = releases_sql["release_date"]

    for i, (_, r) in enumerate(releases_sql.iterrows()):
        logger.info(
            f"Inserting release {i + 1} of {len(releases_sql)}: "
            f"{r['title']} ({r['mb_release_id']})"
        )

        types = list(r["types"])
        types.sort()

        cur.execute(
            """
            insert into mb_releases
            (id, title, types, release_date, created_at)
            values
            (%s, %s, %s, %s, %s)
            on conflict do nothing
            """,
            (
                r["mb_release_id"],
                r["title"],
                "".join(["{", ",".join(types), "}"]),
                dt_to_int(r["release_date"]),
                dt_to_int(pd.to_datetime("now", utc=True)),
            ),
        )


def insert_artist_releases(cur: cursor, releases_df: pd.DataFrame) -> None:
    """
    insert artist releases (join table records) into database

    Parameters
    ----------
    cur : cursor
    releases_df : pd.DataFrame

    Returns
    -------
    None
    """

    # release groups might belong to multiple artists, so store this relationship in a
    # join table
    artist_releases_sql = releases_df.loc[:, ["mb_artist_id", "mb_release_id"]]
    artist_releases_sql = artist_releases_sql.rename(columns={"id": "mb_release_id"})
    artist_releases_sql = artist_releases_sql.drop_duplicates()

    for i, r in artist_releases_sql.iterrows():
        logger.info(f"Inserting artist release {i + 1} of {len(artist_releases_sql)}")

        cur.execute(
            """
            insert into mb_artist_releases
            (mb_artist_id, mb_release_id)
            values
            (%s, %s)
            on conflict do nothing
            """,
            (r["mb_artist_id"], r["mb_release_id"]),
        )


def get_mb_relationships(artist_id: str) -> list[dict[str, str]]:
    """
    get all of an artist's relationships in MusicBrainz

    Parameters
    ----------
    artist_id : str
        a MusicBrainz artist ID

    Returns
    -------
    list[dict[str, str]]
         a list of dictionaries containing artist relationship metadata
    """

    artist = mb.get_artist_by_id(artist_id, includes=["artist-rels"])

    if "relations" not in artist:
        return []

    # subset to relationships to the kinds that are in the list of relevant ones
    valid_rels = [
        x
        for x in artist["relations"]
        if x["type"] in valid_artist_rel_types
        and (
            valid_artist_rel_types[x["type"]] is None
            or valid_artist_rel_types[x["type"]] == x["direction"]
        )
    ]

    logger.info(f"{len(valid_rels)} artist relationships")

    return [
        {
            "mb_artist_id": artist_id,
            "type": x["type"],
            "direction": x["direction"],
            "other_mb_artist_id": x["artist"]["id"],
            "other_mb_artist_name": x["artist"]["name"],
        }
        for x in valid_rels
    ]


def get_existing_relationships(cur: cursor, artist_id: str) -> list[dict[str, str]]:
    """
    get the list of artist relationships already stored in database

    Parameters
    ----------
    cur : cursor
    artist_id : str
        a MusicBrainz artist ID

    Returns
    -------
    list[dict[str, str]]
        the existing artist relationships
    """

    # get all of their previously stored relationships
    cur.execute(
        """
            select
               mb_artist_id,
               type,
               direction,
               other_mb_artist_id
           from
               mb_artist_relationships
           where
               mb_artist_id = %s;
        """,
        (artist_id,),
    )

    existing_relationships = [
        {
            "mb_artist_id": x[0],
            "type": x[1],
            "direction": x[2],
            "other_mb_artist_id": x[3],
        }
        for x in cur.fetchall()
    ]

    logger.info(f"{len(existing_relationships)} existing relationships")
    return existing_relationships


def filter_new_relationships(
    relationships: list[dict[str, str]],
    existing_relationships: list[dict[str, str]],
) -> pd.DataFrame:
    """
    filter the artist relationships to those not already stored in database

    Parameters
    ----------

    Returns
    -------
    pd.DataFrame
        just the new artist relationships
    """

    rel_df = pd.DataFrame(relationships, dtype="string")

    if len(existing_relationships) == 0:
        new_relationships = rel_df
    else:
        existing_rel_df = pd.DataFrame(existing_relationships, dtype="string")

        new_relationships = anti_join(
            rel_df,
            existing_rel_df,
            on=["mb_artist_id", "type", "direction", "other_mb_artist_id"],
        )

    new_relationships = new_relationships.drop_duplicates()  # just in case

    logger.info(f"{len(new_relationships)} new relationships")
    return new_relationships


def insert_relationships(cur: cursor, relationships_df: pd.DataFrame) -> None:
    """
    insert artist relationships into database

    Parameters
    ----------
    cur : cursor
    relationships_df : pd.DataFrame

    Returns
    -------
    None
    """

    for i, (_, r) in enumerate(relationships_df.iterrows()):
        logger.info(
            f"Inserting relationship {i + 1} of {len(relationships_df)}: "
            f"{r['type']} {r['other_mb_artist_name']} ({r['other_mb_artist_id']})"
        )

        cur.execute(
            """
            insert into mb_artist_relationships
                (
                    mb_artist_id,
                    type,
                    direction,
                    other_mb_artist_id,
                    other_mb_artist_name,
                    created_at
            ) values
                (%s, %s, %s, %s, %s, %s)
            """,
            (
                r["mb_artist_id"],
                r["type"],
                r["direction"],
                r["other_mb_artist_id"],
                r["other_mb_artist_name"],
                dt_to_int(pd.to_datetime("now", utc=True)),
            ),
        )


def checked_artist(cur: cursor, artist_id: str) -> None:
    """
    touch last_checked column in database so that this artist is put at the back of the
    queue

    Parameters
    ----------
    cur : cursor
    artist_id : str

    Returns
    -------
    None
    """

    cur.execute(
        """
        update mb_artists
        set last_checked = %s
        where id=%s
        """,
        (dt_to_int(pd.to_datetime("now", utc=True)), artist_id),
    )


def dt_to_int(x: str | pd.Timestamp) -> int | None:
    """
    convert possibly empty string or timestamp to int

    Parameters
    ----------
    x : str | pd.Timestamp

    Returns
    -------
    int | None
    """

    if isinstance(x, str):
        x = pd.to_datetime(x)

        if pd.isna(x):
            return None

    return round(x.value / 1e6)


def anti_join(
    x: pd.DataFrame, y: pd.DataFrame, on: str | Iterable[str]
) -> pd.DataFrame:
    """
    anti-join

    Parameters
    ----------
    x : pd.DataFrame
    y: pd.DataFrame
    on: str | Iterable[str]
        the columns to anti join on

    Returns
    -------
    pd.DataFrame
        a subsetted data frame

    """

    if len(y) == 0:
        return x

    # make a data frame of just the join columns
    dummy = y.loc[:, on]  # pyright: ignore

    # convert to data frame if `on` was a single column
    if isinstance(dummy, pd.Series):
        dummy = dummy.to_frame()

    dummy.loc[:, "dummy_col"] = 1  # indicator variable

    # attempt to join left data frame (`x`) to the dummy data frame
    merged = x.merge(dummy, on=on, how="left")

    # keep only the non-matches
    return merged.loc[merged["dummy_col"].isna(), x.columns.tolist()]
