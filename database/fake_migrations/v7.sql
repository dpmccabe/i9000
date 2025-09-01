BEGIN;

DROP VIEW IF EXISTS relationships CASCADE;

CREATE VIEW relationships AS  SELECT mb_artist_relationships.id,
    mb_artist_relationships.mb_artist_id AS artist_id,
    mb_artists.name AS artist,
    mb_artist_relationships.type,
    mb_artist_relationships.direction,
    mb_artist_relationships.other_mb_artist_id AS other_artist_id,
    mb_artist_relationships.other_mb_artist_name AS other_artist,
    mb_artist_relationships.acked,
    mb_artist_relationships.created_at
   FROM mb_artist_relationships
     JOIN mb_artists ON mb_artist_relationships.mb_artist_id = mb_artists.id
  WHERE NOT (mb_artist_relationships.other_mb_artist_id IN ( SELECT mb_artists_1.id
           FROM mb_artists mb_artists_1));
COMMENT ON VIEW relationships IS E'@sortable\n@filterable';
COMMENT ON VIEW relationships IS E'@primaryKey id';

END;
