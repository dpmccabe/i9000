BEGIN;

DROP VIEW IF EXISTS releases CASCADE;

CREATE VIEW releases AS
    SELECT
        mb_releases.id,
        mb_releases.title,
        mb_releases.types,
        mb_releases.ackstate,
        mb_releases.release_date AS release_date,
        mb_releases.created_at AS created_at,
        array_agg(mb_artists.id ORDER BY mb_artists.name) AS artist_ids,
        array_agg(mb_artists.name ORDER BY mb_artists.name) AS artist_names,
        array_to_string(array_agg(mb_artists.name ORDER BY mb_artists.name), E'\x1e') AS artist_names_s
    FROM mb_releases
    INNER JOIN mb_artist_releases ON mb_releases.id = mb_artist_releases.mb_release_id
    INNER JOIN mb_artists ON mb_artist_releases.mb_artist_id = mb_artists.id
    WHERE release_date <= 1000 * extract(epoch from CURRENT_DATE) OR mb_releases.release_date IS NULL
    GROUP BY mb_releases.id;
COMMENT ON VIEW releases IS E'@sortable\n@filterable';
COMMENT ON VIEW releases IS E'@primaryKey id';

END;
