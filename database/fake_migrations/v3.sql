BEGIN;

DROP FUNCTION IF EXISTS tracks_n_plays;
DROP FUNCTION IF EXISTS tracks_last_played;

drop view if exists tracks_with_plays cascade;

DROP TABLE IF EXISTS plays cascade;

CREATE TABLE plays (
	id serial PRIMARY KEY,
	track_id text REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE RESTRICT NOT NULL,
	dt bigint NOT NULL
);
COMMENT ON TABLE plays IS E'@mncud';

CREATE INDEX plays_track_id_index ON plays(track_id);
CREATE INDEX plays_dt_index ON plays(dt);

insert into plays (track_id, dt)
select id, last_played from tracks
cross join generate_series(0, n_plays - 1) as n
where n_plays > 0;

alter table tracks drop column last_played cascade;
alter table tracks drop column n_plays cascade;

CREATE or replace FUNCTION tracks_n_plays(t tracks) RETURNS integer
AS $$
    SELECT count(*) as n_plays
    from plays
    inner join tracks on plays.track_id = tracks.id
    where plays.track_id = t.id;
$$ LANGUAGE SQL STABLE;
COMMENT ON FUNCTION tracks_n_plays IS E'@sortable\n@filterable';

CREATE or replace FUNCTION tracks_last_played(t tracks) RETURNS bigint
AS $$
    SELECT max(dt) as last_played
    from plays
    inner join tracks on plays.track_id = tracks.id
    where plays.track_id = t.id
    group by plays.track_id;
$$ LANGUAGE SQL STABLE;
COMMENT ON FUNCTION tracks_last_played IS E'@sortable\n@filterable';

CREATE or replace FUNCTION tracks_in_playlist(_playlist_id integer) RETURNS SETOF tracks AS $$
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
        tracks.genre,
        tracks.compilation,
        tracks.comments,
        tracks.bitrate,
        tracks.start_at,
        tracks.stop_at,
        tracks.file_size,
        playlist_tracks.ix AS ix,
        tracks.created_at,
        tracks.updated_at
    FROM tracks
    LEFT JOIN playlist_tracks ON _playlist_id IS NOT NULL AND tracks.id = playlist_tracks.track_id
    WHERE _playlist_id IS NULL OR (playlist_tracks.playlist_id = _playlist_id)
$$ LANGUAGE SQL STABLE;
COMMENT ON FUNCTION tracks_in_playlist IS E'@sortable\n@filterable';

END;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO i9000_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO i9000_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO i9000_user;
