BEGIN;

DROP VIEW IF EXISTS relationships CASCADE;

CREATE VIEW relationships AS
SELECT
    mb_artist_relationships.*,
    mb_artists.name AS mb_artists_name
FROM
    mb_artist_relationships
    INNER JOIN mb_artists ON mb_artist_relationships.mb_artist_id = mb_artists.id
WHERE
    mb_artist_relationships.other_mb_artist_id NOT IN (
        SELECT
            id
        FROM
            mb_artists);

COMMENT ON VIEW relationships IS E'@sortable\n@filterable';
COMMENT ON VIEW relationships IS E'@primaryKey id';

END;
