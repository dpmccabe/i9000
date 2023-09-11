DROP TYPE IF EXISTS mb_ackstates;



DROP FUNCTION IF EXISTS create_playlist_tracks;
DROP FUNCTION IF EXISTS delete_playlist_tracks;
DROP FUNCTION IF EXISTS empty_playlist;
DROP FUNCTION IF EXISTS tracks_genre_cat;
DROP FUNCTION IF EXISTS tracks_genre_color;
DROP FUNCTION IF EXISTS reix_playlist;
DROP FUNCTION IF EXISTS push_playlist_tracks_history;
DROP FUNCTION IF EXISTS restore_from_playlist_tracks_history;
DROP FUNCTION IF EXISTS clear_playlist_tracks_history;
DROP FUNCTION IF EXISTS search_tracks;
DROP FUNCTION IF EXISTS tracks_in_playlist;
DROP FUNCTION IF EXISTS search_playlist_tracks;
DROP FUNCTION IF EXISTS autocomplete_tag;



DROP VIEW IF EXISTS playlist_stats;
DROP VIEW IF EXISTS starred_stats;
DROP VIEW IF EXISTS albums;



DROP TABLE IF EXISTS mb_artist_releases CASCADE;
DROP TABLE IF EXISTS mb_artists CASCADE;
DROP TABLE IF EXISTS mb_releases CASCADE;
DROP TABLE IF EXISTS playlist_folders CASCADE;
DROP TABLE IF EXISTS playlist_tracks CASCADE;
DROP TABLE IF EXISTS playlist_tracks_history CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;



CREATE TYPE mb_ackstates AS ENUM ('new', 'todo', 'acked');



CREATE TABLE mb_artists (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    last_checked timestamp with time zone
);

CREATE INDEX mb_artists_last_checked_index ON mb_artists(last_checked);
CREATE INDEX mb_artists_name_index ON mb_artists(name);



CREATE TABLE mb_releases (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    types text[] NOT NULL,
    release_date date,
    ackstate mb_ackstates NOT NULL DEFAULT 'new',
    created_at timestamp with time zone NOT NULL
);

CREATE INDEX mb_releases_created_at_index ON mb_releases(created_at);
CREATE INDEX mb_releases_release_date_index ON mb_releases(release_date);
CREATE INDEX mb_releases_ackstate_index ON mb_releases(ackstate);



CREATE TABLE mb_artist_releases (
    mb_artist_id uuid REFERENCES mb_artists(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    mb_release_id uuid REFERENCES mb_releases(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT mb_artist_releases_pkey PRIMARY KEY (mb_artist_id, mb_release_id)
);



CREATE TABLE playlist_folders (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    ix serial
);

CREATE TABLE playlists (
    id serial PRIMARY KEY,
    playlist_folder_id integer REFERENCES playlist_folders(id) ON DELETE SET NULL ON UPDATE RESTRICT,
    name text NOT NULL UNIQUE,
    sort_col text DEFAULT 'ix',
    sort_asc boolean DEFAULT true,
    ix serial
);

CREATE INDEX playlists_playlist_folder_id_index ON playlists(playlist_folder_id);



CREATE TABLE tracks (
    id text PRIMARY KEY,
    album_artist text,
    artist text,
    album text,
    disc_i integer,
    disc_n integer,
    title text,
    track_i integer,
    track_n integer,
    duration integer NOT NULL,
    composer text,
    grouping text,
    rating integer,
    year integer,
    n_plays integer NOT NULL DEFAULT 0,
    last_played timestamp with time zone,
    genre text,
    compilation boolean NOT NULL DEFAULT FALSE,
    comments text,
    bitrate integer NOT NULL,
    start_at integer,
    stop_at integer,
    file_size integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    ix integer
);

CREATE INDEX tracks_artist_sort_index ON tracks(album_artist, album, disc_i, track_i);
CREATE INDEX tracks_n_plays_index ON tracks(n_plays);
CREATE INDEX tracks_last_played_index ON tracks(last_played);
CREATE INDEX tracks_rating_index ON tracks(rating);
CREATE INDEX tracks_genre_index ON tracks(genre);
CREATE INDEX tracks_title_index ON tracks(title);



CREATE FUNCTION create_tracks(_tracks tracks[]) RETURNS void AS $$
    INSERT INTO tracks
    SELECT * FROM unnest(_tracks) t;
$$ LANGUAGE SQL VOLATILE;



CREATE TABLE playlist_tracks (
    playlist_id integer REFERENCES playlists(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    track_id text REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    ix integer NOT NULL,
    CONSTRAINT playlist_tracks_pkey PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX playlist_tracks_multi_index ON playlist_tracks(playlist_id, ix);



CREATE TABLE playlist_tracks_history (
    history_id integer NOT NULL,
    playlist_id integer REFERENCES playlists(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    track_id text REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    ix integer NOT NULL,
    CONSTRAINT playlist_tracks_history_pkey PRIMARY KEY (history_id, playlist_id, track_id)
);

CREATE INDEX playlist_tracks_history_multi_index ON playlist_tracks_history(history_id, playlist_id, ix);



CREATE FUNCTION push_playlist_tracks_history(_playlist_id integer, _current_history_id integer default null) RETURNS SETOF integer
AS $$
    DECLARE next_history_id integer;

    BEGIN

    if _current_history_id is not null then
        DELETE FROM playlist_tracks_history WHERE history_id > _current_history_id;
    end if;

    SELECT coalesce((SELECT MAX(history_id)+1 FROM playlist_tracks_history), 0) INTO next_history_id;

    INSERT INTO playlist_tracks_history (history_id, playlist_id, track_id, ix)
    SELECT coalesce(next_history_id, 0), _playlist_id, track_id, ix FROM playlist_tracks
    WHERE playlist_id=_playlist_id;

    RETURN QUERY SELECT DISTINCT history_id FROM playlist_tracks_history ORDER BY history_id;

    END
$$ LANGUAGE plpgsql VOLATILE;



CREATE FUNCTION restore_from_playlist_tracks_history(_history_id integer) RETURNS setof integer
AS $$
    BEGIN

    DELETE FROM playlist_tracks WHERE playlist_id IN (
        SELECT playlist_id FROM playlist_tracks_history WHERE history_id = _history_id LIMIT 1
    );

    INSERT INTO playlist_tracks (playlist_id, track_id, ix)
    SELECT playlist_id, track_id, ix FROM playlist_tracks_history WHERE history_id = _history_id ORDER BY ix;

    RETURN QUERY SELECT playlist_id FROM playlist_tracks_history WHERE history_id = _history_id LIMIT 1;

    END
$$ LANGUAGE plpgsql VOLATILE;



CREATE FUNCTION clear_playlist_tracks_history() RETURNS void
AS $$
    TRUNCATE playlist_tracks_history;
$$ LANGUAGE SQL VOLATILE;



CREATE VIEW playlist_stats AS
    SELECT playlist_tracks.playlist_id,
        CAST(COUNT(playlist_tracks.*) AS INTEGER) AS n_tracks,
        CAST(SUM(tracks.duration) AS BIGINT) AS total_tracks_duration
    FROM playlist_tracks
    JOIN tracks ON playlist_tracks.track_id = tracks.id
    GROUP BY playlist_tracks.playlist_id;



CREATE FUNCTION create_playlist_tracks(_playlist_tracks playlist_tracks[]) RETURNS void AS $$
    INSERT INTO playlist_tracks
    SELECT * FROM unnest(_playlist_tracks) t;
$$ LANGUAGE SQL VOLATILE;



CREATE FUNCTION delete_playlist_tracks(_playlist_id integer, _track_ids text[]) RETURNS void AS $$
    DELETE FROM playlist_tracks WHERE playlist_id=_playlist_id AND track_id=ANY(_track_ids)
$$ LANGUAGE SQL VOLATILE;



CREATE FUNCTION empty_playlist(_playlist_id integer) RETURNS void
AS $$
    DELETE FROM playlist_tracks WHERE playlist_id=_playlist_id
$$ LANGUAGE SQL VOLATILE;



CREATE FUNCTION tracks_genre_cat(t tracks) RETURNS text
AS $$
    SELECT
        CASE
            WHEN t.genre IN ('Other', 'Jazz') THEN 'other'
            WHEN t.genre='Classical' THEN 'classical'
            WHEN t.genre='World' THEN 'world'
            WHEN substring(t.genre FROM '^(.+):') IN ('C', 'F') THEN 'world'
        END
$$ LANGUAGE SQL STABLE;
COMMENT ON FUNCTION tracks_genre_cat IS E'@sortable\n@filterable';



CREATE FUNCTION tracks_genre_color(t tracks) RETURNS text
AS $$
    SELECT
        CASE
            WHEN t.genre='Other' THEN 'other'
            WHEN t.genre='Jazz' THEN 'jazz'
            WHEN t.genre='Classical' THEN 'classical'
            WHEN t.genre='World' THEN 'world'
            WHEN substring(t.genre FROM '^(.+):')='F' THEN 'world'
            WHEN substring(t.genre FROM '^(.+):')='C' THEN 'celtic'
        END
$$ LANGUAGE SQL STABLE;
COMMENT ON FUNCTION tracks_genre_color IS E'@sortable\n@filterable';



CREATE VIEW starred_stats AS
    SELECT
        tracks.rating,
        tracks_genre_cat(tracks.*) AS genre_cat,
        sum(tracks.duration) AS duration
    FROM tracks
    WHERE tracks.rating IS NOT NULL
    GROUP BY genre_cat, tracks.rating
    ORDER BY genre_cat, tracks.rating;



CREATE FUNCTION reix_playlist(_playlist_id integer) RETURNS void AS $$
    UPDATE playlist_tracks t
    SET ix = o.ix - 1
    FROM (
        SELECT
            playlist_id,
            track_id,
            row_number() OVER (ORDER BY ix) AS ix
        FROM playlist_tracks
        WHERE playlist_id=_playlist_id
    ) o
    WHERE t.playlist_id = o.playlist_id AND t.track_id = o.track_id;
$$ LANGUAGE SQL VOLATILE;



COMMENT ON TABLE tracks IS E'@mncud';
COMMENT ON TABLE playlists IS E'@mncud';
COMMENT ON TABLE playlist_tracks IS E'@mncud';
COMMENT ON TABLE playlist_folders IS E'@mncud';



CREATE VIEW albums AS
    SELECT min(t.id) AS id,
        t.album_artist,
        t.album,
        t.genre,
        t.genre_color,
        count(*) AS n_tracks,
        t.year,
        sum(t.duration) AS total_duration,
        EXTRACT(epoch FROM min(t.created_at)) AS created_at
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



CREATE VIEW releases AS
    SELECT
        mb_releases.id,
        mb_releases.title,
        mb_releases.types,
        mb_releases.ackstate,
        EXTRACT(epoch FROM mb_releases.release_date) AS release_date,
        EXTRACT(epoch FROM mb_releases.created_at) AS created_at,
        array_agg(mb_artists.id ORDER BY mb_artists.name) AS artist_ids,
        array_agg(mb_artists.name ORDER BY mb_artists.name) AS artist_names
    FROM mb_releases
    INNER JOIN mb_artist_releases ON mb_releases.id = mb_artist_releases.mb_release_id
    INNER JOIN mb_artists ON mb_artist_releases.mb_artist_id = mb_artists.id
    WHERE release_date <= CURRENT_DATE OR mb_releases.release_date IS NULL
    GROUP BY mb_releases.id;
COMMENT ON VIEW releases IS E'@sortable\n@filterable';
COMMENT ON VIEW releases IS E'@primaryKey id';



CREATE USER i9000_user;
GRANT CONNECT ON DATABASE i9000 TO i9000_user;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO i9000_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO i9000_user;
ALTER ROLE i9000_user WITH PASSWORD 'todo';
