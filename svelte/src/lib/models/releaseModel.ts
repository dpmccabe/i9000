/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return,
  @typescript-eslint/no-unsafe-argument
*/
import { DateTime } from 'luxon';
import { db, formatDate, type TabField, TabSettings } from '../../internal';

export type Ackstate = 'new' | 'todo' | 'acked';

export interface Artist {
  id: string;
  name: string;
}

export const releaseFields: Record<string, TabField> = {
  ackstate: {
    dbCols: ['ackstate'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'State',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['ackstate', 'artistNames', 'title'],
    aggregatable: true,
    aggregateFlat: false,
    isEnum: true,
  },
  artistNames: {
    dbCols: ['artistNames', 'artistIds'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Artist',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['artistNames', 'title'],
    aggregatable: true,
    aggregateFlat: true,
  },
  title: {
    dbCols: ['title'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Title',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['title', 'artistNames'],
    aggregatable: false,
  },
  types: {
    dbCols: ['types'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Type',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['types', 'artistNames', 'title'],
    aggregatable: true,
    aggregateFlat: true,
  },
  releaseDate: {
    dbCols: ['releaseDate'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Released on',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['releaseDate', 'artistNames', 'title'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDate,
    rangeType: 'date',
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
    sortCols: ['createdAt', 'artistNames', 'title'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDate,
    rangeType: 'date',
  },
};

export class Release {
  id: string;
  ackstate: Ackstate;
  artists: Artist[];
  title: string;
  types: string[];
  releaseDate?: DateTime;
  createdAt: DateTime;

  constructor(rec: Record<string, any>) {
    this.id = rec.id;
    this.ackstate = rec.ackstate.toLowerCase();

    this.artists = Array.from(
      { length: rec.artistIds.length },
      (_: undefined, i: number): Artist => {
        return { id: rec.artistIds[i], name: rec.artistNames[i] };
      }
    );

    this.title = rec.title;
    this.types = rec.types;
    if (rec.releaseDate != null) {
      this.releaseDate = DateTime.fromMillis(Number(BigInt(rec.releaseDate)), {
        zone: 'UTC',
      });
    }
    this.createdAt = DateTime.fromMillis(Number(BigInt(rec.createdAt)), {
      zone: 'UTC',
    });
  }
}

export class ReleaseSettings extends TabSettings<Release> {
  constructor() {
    super({
      tabFields: { ...releaseFields },
      tabName: 'release',
      sortBy: { col: 'ackstate', asc: true },
      queryName: 'releases',
    });
  }

  recordCreator(r: Record<string, any>): Release {
    return new Release(r);
  }

  statsContentCreator(resp: any): string {
    const count: number = resp[this.queryName].totalCount;
    return count === 1 ? `${count} release` : `${count} releases`;
  }
}

export async function ackRelease(
  releaseId: string,
  ackstate: Ackstate
): Promise<void> {
  const q = `
    mutation ackRelease($id: UUID!, $ackstate: MbAckstates!) {
      updateMbRelease(input: { patch: { ackstate: $ackstate }, id: $id }) {
        clientMutationId
      }
    }
  `;

  await db(q, { id: releaseId, ackstate: ackstate.toUpperCase() });
}
