/*
  eslint-disable
  @typecript-eslint/no-explicit-any,
  @typecript-eslint/no-unsafe-call,
  @typecript-eslint/no-unsafe-assignment,
  @typecript-eslint/no-unsafe-member-access,
  @typecript-eslint/no-unsafe-return,
  @typecript-eslint/no-unsafe-argument
*/
import { DateTime } from 'luxon';
import {
  type Artist,
  db,
  formatDate,
  nNewRelationships,
  type TabField,
  TabSettings,
} from '../../internal';

export type RelationshipType =
  | 'member of band'
  | 'subgroup'
  | 'artist rename'
  | 'founder'
  | 'collaboration'
  | 'is person';
export type RelationshipDirection = 'forward' | 'backward';

export const relationshipFields: Record<string, TabField> = {
  artist: {
    dbCols: ['artist', 'artistId'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Artist',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['artist', 'type', 'otherArtist'],
    aggregatable: true,
    globallySearchable: true,
  },
  type: {
    dbCols: ['type'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Type',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['type', 'artist', 'otherArtist'],
    aggregatable: true,
    isEnum: true,
  },
  direction: {
    dbCols: ['direction'],
    displayed: false,
    mobileDisplayed: false,
    displayName: 'Direction',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: false,
    sortCols: ['direction', 'artist', 'otherArtist'],
    aggregatable: true,
    isEnum: true,
  },
  otherArtist: {
    dbCols: ['otherArtist', 'otherArtistId'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Other artist',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['otherArtist', 'type', 'artist'],
    aggregatable: true,
    globallySearchable: true,
  },
  acked: {
    dbCols: ['acked'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Actions',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['acked', 'artist', 'type', 'otherArtist'],
    sortReverse: true,
    aggregatable: true,
  },
  createdAt: {
    dbCols: ['createdAt'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Created on',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['createdAt', 'artist', 'otherArtist'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDate,
    rangeType: 'date',
  },
};

export class Relationship {
  id: string;
  artist: Artist;
  type: RelationshipType;
  direction: RelationshipDirection;
  otherArtist: Artist;
  acked: boolean;
  createdAt: DateTime;

  constructor(rec: Record<string, any>) {
    this.id = rec.id;
    this.artist = { id: rec.artistId, name: rec.artist };
    this.type = rec.type;
    this.direction = rec.direction;
    this.otherArtist = { id: rec.otherArtistId, name: rec.otherArtist };
    this.acked = rec.acked;
    this.createdAt = DateTime.fromMillis(Number(BigInt(rec.createdAt)), {
      zone: 'UTC',
    });
  }
}

export class RelationshipSettings extends TabSettings<Relationship> {
  constructor() {
    super({
      tabFields: { ...relationshipFields },
      tabName: 'relationship',
      sortBy: { col: 'acked', asc: true },
      queryName: 'relationships',
    });
  }

  recordCreator(r: Record<string, any>): Relationship {
    return new Relationship(r);
  }

  statsContentCreator(resp: any): string {
    const count: number = resp[this.queryName].totalCount;
    return count === 1 ? `${count} relationship` : `${count} relationships`;
  }
}

export async function getNNewRelationships(): Promise<number> {
  const q = `
    query nNewRelationships {
      relationships(condition: {acked: false}) {
        totalCount
      }
    }
  `;

  const res: any = await db(q, {});

  return res.relationships.totalCount;
}

export async function ackRelationship(
  relationshipId: string,
  acked: boolean
): Promise<void> {
  const q = `
    mutation ackRelationship($id: Int!, $acked: Boolean!) {
      updateMbArtistRelationship(input: { patch: { acked: $acked }, id: $id }) {
        clientMutationId
      }
    }
  `;

  await db(q, { id: relationshipId, acked: acked });
  nNewRelationships.set(await getNNewRelationships());
}

export async function createMbArtist(
  artistId: string,
  name: string
): Promise<void> {
  const q = `
    mutation createMbArtist($id: UUID!, $name: String!) {
      createMbArtist(input: {mbArtist: {id: $id, name: $name}}) {
        clientMutationId
      }
    }
  `;

  await db(q, { id: artistId, name: name });
}
