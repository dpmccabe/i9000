BEGIN;

drop view if exists albums cascade;
drop view if exists releases cascade;

ALTER TABLE mb_artists ALTER COLUMN name TYPE citext;
ALTER TABLE mb_releases ALTER COLUMN title TYPE citext;
ALTER TABLE playlist_folders ALTER COLUMN name TYPE citext;
ALTER TABLE playlists ALTER COLUMN name TYPE citext;
ALTER TABLE tracks ALTER COLUMN album_artist TYPE citext;
ALTER TABLE tracks ALTER COLUMN artist TYPE citext;
ALTER TABLE tracks ALTER COLUMN album TYPE citext;
ALTER TABLE tracks ALTER COLUMN composer TYPE citext;
ALTER TABLE tracks ALTER COLUMN grouping TYPE citext;
ALTER TABLE tracks ALTER COLUMN title TYPE citext;

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

END;
