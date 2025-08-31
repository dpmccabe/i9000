BEGIN;

DROP TABLE IF EXISTS mb_artist_relationships CASCADE;
DROP TYPE IF EXISTS mb_artist_relationship_types;
DROP TYPE IF EXISTS mb_artist_relationship_directions;

CREATE TYPE mb_artist_relationship_types AS ENUM (
    'member of band',
    'subgroup',
    'artist rename',
    'founder',
    'collaboration',
    'is person'
);

CREATE TYPE mb_artist_relationship_directions AS ENUM (
    'forward',
    'backward'
);

CREATE TABLE mb_artist_relationships (
    id serial PRIMARY KEY,
    mb_artist_id uuid NOT NULL REFERENCES mb_artists (id) ON DELETE CASCADE ON UPDATE RESTRICT,
    type mb_artist_relationship_types NOT NULL,
    direction mb_artist_relationship_directions NOT NULL,
    other_mb_artist_id uuid NOT NULL,
    other_mb_artist_name text NOT NULL,
    acked boolean NOT NULL DEFAULT FALSE,
    created_at bigint NOT NULL
);

CREATE INDEX mb_artist_relationships_mb_artist_id_index ON mb_artist_relationships(mb_artist_id);
CREATE INDEX mb_artist_relationships_other_mb_artist_id_index ON mb_artist_relationships(other_mb_artist_id);
CREATE INDEX mb_artist_relationships_acked_index ON mb_artist_relationships(acked);
CREATE INDEX mb_artist_relationships_created_at_index ON mb_artist_relationships(created_at);

ALTER TABLE mb_artist_relationships
    ADD CONSTRAINT mb_artist_relationships_unique UNIQUE (mb_artist_id, type, direction, other_mb_artist_id);

END;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO i9000_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO i9000_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO i9000_user;
