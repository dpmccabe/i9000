BEGIN;

DROP FUNCTION IF EXISTS tracks_album_canon cascade;
DROP FUNCTION IF EXISTS tracks_album_artist_canon cascade;
DROP FUNCTION IF EXISTS tracks_artist_canon cascade;
DROP FUNCTION IF EXISTS tracks_title_canon cascade;
DROP FUNCTION IF EXISTS autocomplete_tag;
DROP FUNCTION IF EXISTS tracks_in_playlist;
DROP FUNCTION IF EXISTS search_mb_releases;

DROP VIEW IF EXISTS releases cascade;
DROP VIEW IF EXISTS mb_releases_with_artists cascade;


-- numeric dts (tracks)
ALTER TABLE tracks ADD COLUMN created_at_new bigint;
ALTER TABLE tracks ADD COLUMN updated_at_new bigint;
ALTER TABLE tracks ADD COLUMN last_played_new bigint;

update tracks set created_at_new = 1000 * EXTRACT(epoch from created_at);
update tracks set updated_at_new = 1000 * EXTRACT(epoch from updated_at);
update tracks set last_played_new = 1000 * EXTRACT(epoch from last_played);

ALTER TABLE tracks ALTER COLUMN created_at_new SET NOT NULL;

ALTER TABLE tracks drop COLUMN created_at cascade;
ALTER TABLE tracks drop COLUMN updated_at cascade;
ALTER TABLE tracks drop COLUMN last_played cascade;

ALTER TABLE tracks rename COLUMN created_at_new TO created_at;
ALTER TABLE tracks rename COLUMN updated_at_new TO updated_at;
ALTER TABLE tracks rename COLUMN last_played_new TO last_played;

CREATE INDEX tracks_last_played_index ON tracks(last_played);

-- recreate view
CREATE VIEW albums AS
    SELECT min(t.id) AS id,
        t.album_artist,
        t.album,
        t.genre,
        t.genre_color,
        count(*) AS n_tracks,
        t.year,
        sum(t.duration) AS total_duration,
        min(t.created_at) AS created_at
    FROM (
        SELECT tracks.id,
        tracks.album_artist,
        tracks.album,
        tracks.genre,
        tracks.year,
        tracks_genre_color(tracks.*) AS genre_color,
        tracks.duration,
        tracks.created_at
        FROM tracks
        WHERE tracks.album_artist IS NOT NULL AND tracks.album IS NOT NULL
    ) t
    GROUP BY t.album_artist, t.album, t.genre, t.genre_color, t.year;
COMMENT ON VIEW albums IS E'@sortable\n@filterable';
COMMENT ON VIEW albums IS E'@primaryKey id';

-- numeric dts (releases)
ALTER TABLE mb_releases ADD COLUMN release_date_new bigint;
ALTER TABLE mb_releases ADD COLUMN created_at_new bigint;
update mb_releases set release_date_new = 1000 * EXTRACT(epoch from release_date);
update mb_releases set created_at_new = 1000 * EXTRACT(epoch from created_at);
ALTER TABLE mb_releases ALTER COLUMN created_at_new SET NOT NULL;
ALTER TABLE mb_releases drop COLUMN release_date cascade;
ALTER TABLE mb_releases drop COLUMN created_at cascade;
ALTER TABLE mb_releases rename COLUMN release_date_new TO release_date;
ALTER TABLE mb_releases rename COLUMN created_at_new TO created_at;
CREATE INDEX mb_releases_release_date_index ON mb_releases(release_date);
CREATE INDEX mb_releases_created_at_index ON mb_releases(created_at);

ALTER TABLE mb_artists ADD COLUMN last_checked_new bigint;
update mb_artists set last_checked_new = 1000 * EXTRACT(epoch from last_checked);
ALTER TABLE mb_artists drop COLUMN last_checked cascade;
ALTER TABLE mb_artists rename COLUMN last_checked_new TO last_checked;
CREATE INDEX mb_artists_last_checked_index ON mb_artists(last_checked);

-- recreate view
CREATE VIEW releases AS
    SELECT
        mb_releases.id,
        mb_releases.title,
        mb_releases.types,
        mb_releases.ackstate,
        mb_releases.release_date AS release_date,
        mb_releases.created_at AS created_at,
        array_agg(mb_artists.id ORDER BY mb_artists.name) AS artist_ids,
        array_agg(mb_artists.name ORDER BY mb_artists.name) AS artist_names
    FROM mb_releases
    INNER JOIN mb_artist_releases ON mb_releases.id = mb_artist_releases.mb_release_id
    INNER JOIN mb_artists ON mb_artist_releases.mb_artist_id = mb_artists.id
    WHERE release_date <= 1000 * extract(epoch from CURRENT_DATE) OR mb_releases.release_date IS NULL
    GROUP BY mb_releases.id;
COMMENT ON VIEW releases IS E'@sortable\n@filterable';
COMMENT ON VIEW releases IS E'@primaryKey id';

--tracks
drop function if exists tracks_in_playlist;

CREATE FUNCTION tracks_in_playlist(_playlist_id integer) RETURNS SETOF tracks AS $$
    SELECT
        tracks.id,
        tracks.album_artist,
        tracks.artist,
        tracks.album,
        tracks.disc_i,
        tracks.disc_n,
        tracks.title,
        tracks.track_i,
        tracks.track_n,
        tracks.duration,
        tracks.composer,
        tracks.grouping,
        tracks.rating,
        tracks.year,
        tracks.n_plays,
        tracks.genre,
        tracks.compilation,
        tracks.comments,
        tracks.bitrate,
        tracks.start_at,
        tracks.stop_at,
        tracks.file_size,
        playlist_tracks.ix AS ix,
        tracks.created_at,
        tracks.updated_at,
        tracks.last_played
    FROM tracks
    LEFT JOIN playlist_tracks ON _playlist_id IS NOT NULL AND tracks.id = playlist_tracks.track_id
    WHERE _playlist_id IS NULL OR (playlist_tracks.playlist_id = _playlist_id)
$$ LANGUAGE SQL STABLE;
COMMENT ON FUNCTION tracks_in_playlist IS E'@sortable\n@filterable';

--shuffle_playlist
DROP FUNCTION IF EXISTS shuffle_playlist;

CREATE FUNCTION shuffle_playlist(_playlist_id integer) RETURNS void AS $$
    UPDATE playlist_tracks t
    SET ix = o.ix
    FROM (
        SELECT
            playlist_id,
            track_id,
            (ROW_NUMBER() OVER (ORDER BY RANDOM())) - 1 as ix
        FROM playlist_tracks
        WHERE playlist_id=_playlist_id
    ) o
    WHERE t.playlist_id = o.playlist_id AND t.track_id = o.track_id;
$$ LANGUAGE SQL VOLATILE;

END;
