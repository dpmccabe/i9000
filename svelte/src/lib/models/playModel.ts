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
import {
  db,
  formatDateTime,
  type Indexable,
  relateTabFields,
  type TabField,
  TabSettings,
  Track,
  trackFields,
} from '../../internal';

export const playFields: Record<string, TabField> = {
  id: {
    dbCols: ['id'],
    displayed: false,
    displayName: 'ID',
    truncatable: false,
    numeric: false,
    sortable: true,
    sortCols: ['id'],
    aggregatable: false,
  },
  ...relateTabFields(trackFields, 'track', {
    ix: {
      displayed: false,
      displayName: 'Track #',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    cached: {
      displayed: false,
      mobileDisplayed: false,
      displayName: 'Track ☁',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    id: {
      displayed: false,
      displayName: 'Track iD',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    title: {
      displayed: true,
      mobileDisplayed: true,
      displayName: 'Track title',
      truncatable: true,
      sortable: false,
      filterType: undefined,
      aggregatable: false,
    },
    artist: {
      displayed: true,
      mobileDisplayed: true,
      displayName: 'Track artist',
      truncatable: true,
      sortable: false,
      filterType: undefined,
      aggregatable: false,
    },
    album: {
      displayed: true,
      mobileDisplayed: true,
      displayName: 'Track album',
      truncatable: true,
      sortable: false,
      filterType: undefined,
      aggregatable: false,
    },
    comments: {
      displayed: false,
      displayName: 'Track comments',
      truncatable: true,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    compilation: {
      displayed: false,
      displayName: 'Track compilation?',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    composer: {
      displayed: false,
      displayName: 'Track composer',
      truncatable: true,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    grouping: {
      displayed: false,
      mobileDisplayed: false,
      displayName: 'Track grouping',
      truncatable: true,
      sortable: false,
      filterType: undefined,
      aggregatable: false,
    },
    disc: {
      displayed: false,
      displayName: 'Track disc',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    track: {
      displayed: false,
      displayName: 'Track track',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    duration: {
      displayed: false,
      displayName: 'Track duration',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    rating: {
      displayed: false,
      displayName: 'Track rating',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    genre: {
      displayed: false,
      displayName: 'Track genre',
      truncatable: true,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    year: {
      displayed: false,
      displayName: 'Track year',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    nPlays: {
      displayed: true,
      mobileDisplayed: true,
      displayName: 'Track plays',
      truncatable: false,
      sortable: false,
      filterType: undefined,
      aggregatable: false,
    },
    bitrate: {
      displayed: false,
      displayName: 'Track bitrate',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    fileSize: {
      displayed: false,
      displayName: 'Track file size',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    startAt: {
      displayed: false,
      displayName: 'Track start at',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    stopAt: {
      displayed: false,
      displayName: 'Track stop at',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    lastPlayed: {
      displayed: false,
      displayName: 'Track last played',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    createdAt: {
      displayed: false,
      displayName: 'Track created at',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
    updatedAt: {
      displayed: false,
      displayName: 'Track updated at',
      truncatable: false,
      aggregatable: false,
      sortable: false,
      filterType: undefined,
    },
  }),
  dt: {
    dbCols: ['dt'],
    displayed: true,
    displayName: 'Played at',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    mobileDisplayed: true,
    sortable: true,
    sortCols: ['dt'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDateTime,
    rangeType: 'date',
  },
  delete: {
    dbCols: [],
    displayed: true,
    mobileDisplayed: false,
    displayName: '',
    truncatable: false,
    numeric: false,
    sortable: false,
    filterType: undefined,
    aggregatable: false,
    fake: true,
  },
};

export class Play {
  id: number;
  dt: DateTime | number;
  track: Track;
  trackId: string;

  constructor(rec: Record<string, any>) {
    this.id = rec.id;
    this.trackId = rec.trackId;
    this.dt = DateTime.fromMillis(Number(BigInt(rec.dt)));
    this.track = new Track(rec.track);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getStaticProperty(propertyName: string): any {
    return (this as Indexable)[propertyName];
  }
}

export class PlaySettings extends TabSettings<Play> {
  constructor() {
    super({
      tabFields: { ...playFields },
      tabName: 'play',
      sortBy: { col: 'dt', asc: false },
      queryName: 'plays',
    });
  }

  recordCreator(r: Record<string, any>): Play {
    return new Play(r);
  }

  statsContentCreator(resp: any): string {
    const count: number = resp[this.queryName].totalCount;
    return count === 1 ? `${count} play` : `${count} plays`;
  }
}

export async function insertPlay(play: Play): Promise<void> {
  const q = `
    mutation insertPlay($play: PlayInput!) {
      createPlay(input: { play: $play }) {
        clientMutationId
      }
    }
  `;

  await db(q, { play: play }, true);
}

export async function deletePlay(id: number): Promise<void> {
  const q = `
    mutation deletePlay($id: Int!) {
      deletePlay(input: { id: $id }) {
        clientMutationId
      }
    }
  `;

  await db(q, { id: id });
}
