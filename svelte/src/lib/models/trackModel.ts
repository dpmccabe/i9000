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
  cachedTrackIds,
  camelToScreamingSnakeCase,
  db,
  formatDateTime,
  formatDuration,
  type Indexable,
  type GcrDuration,
  type ImportArtistGenre,
  normString,
  type TabField,
  TabSettings,
} from '../../internal';

const baseSortCols: string[] = ['albumArtist', 'album', 'discI', 'trackI'];

export const trackFields: Record<string, TabField> = {
  ix: {
    dbCols: ['ix'],
    displayed: true,
    displayName: '#',
    truncatable: false,
    numeric: true,
    sortable: true,
    sortCols: ['ix'],
    aggregatable: false,
    formatter: (v: number): string => (v + 1).toString(),
  },
  cached: {
    dbCols: [],
    displayed: false,
    mobileDisplayed: true,
    displayName: '☁',
    truncatable: false,
    numeric: false,
    sortable: false,
    aggregatable: false,
    formatter: (v: boolean): string => {
      return v ? '✓' : '';
    },
  },
  id: {
    dbCols: ['id'],
    displayed: false,
    displayName: 'ID',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['id'],
    aggregatable: false,
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
    sortCols: ['title', ...baseSortCols],
    aggregatable: false,
    globallySearchable: true,
  },
  artist: {
    dbCols: ['albumArtist', 'artist'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Artist',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: baseSortCols,
    aggregatable: true,
    globallySearchable: true,
  },
  album: {
    dbCols: ['album'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Album',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['album', 'albumArtist', 'discI', 'trackI'],
    aggregatable: true,
    globallySearchable: true,
  },
  comments: {
    dbCols: ['comments'],
    displayed: false,
    displayName: 'Comments',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['comments'],
    aggregatable: false,
  },
  compilation: {
    dbCols: ['compilation'],
    displayed: false,
    displayName: 'Compilation?',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['compilation', ...baseSortCols],
    sortReverse: true,
    aggregatable: true,
    formatter: (v: boolean): string => {
      return v ? '✓' : '';
    },
  },
  composer: {
    dbCols: ['composer'],
    displayed: false,
    displayName: 'Composer',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['composer'],
    aggregatable: false,
    globallySearchable: true,
  },
  grouping: {
    dbCols: ['grouping'],
    displayed: true,
    mobileDisplayed: false,
    displayName: 'Grouping',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['grouping', 'trackI'],
    aggregatable: true,
    globallySearchable: true,
  },
  disc: {
    dbCols: ['discI', 'discN'],
    displayed: true,
    displayName: 'Disc',
    truncatable: false,
    numeric: false,
    sortable: true,
    sortCols: ['discI'],
    aggregatable: false,
  },
  track: {
    dbCols: ['trackI', 'trackN'],
    displayed: true,
    displayName: 'Track',
    truncatable: false,
    numeric: false,
    sortable: true,
    sortCols: ['trackI'],
    aggregatable: false,
  },
  duration: {
    dbCols: ['duration'],
    displayed: true,
    displayName: 'Duration',
    truncatable: false,
    numeric: true,
    sortable: true,
    sortCols: ['duration'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDuration,
    rangeType: 'duration',
  },
  rating: {
    dbCols: ['rating'],
    displayed: true,
    displayName: 'Rating',
    truncatable: false,
    numeric: true,
    filterType: 'text',
    sortable: true,
    sortCols: ['rating', ...baseSortCols],
    sortReverse: true,
    aggregatable: true,
    rangeType: 'int',
  },
  genre: {
    dbCols: ['genre', 'genreColor'],
    displayed: true,
    displayName: 'Genre',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['genre', ...baseSortCols],
    aggregatable: true,
  },
  year: {
    dbCols: ['year'],
    displayed: true,
    displayName: 'Year',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['year', ...baseSortCols],
    sortReverse: true,
    aggregatable: false,
    rangeType: 'int',
  },
  nPlays: {
    dbCols: ['nPlays'],
    displayed: true,
    displayName: 'Plays',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['nPlays', ...baseSortCols],
    sortReverse: true,
    aggregatable: false,
    rangeType: 'int',
  },
  bitrate: {
    dbCols: ['bitrate'],
    displayed: false,
    displayName: 'Bitrate',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['bitrate', ...baseSortCols],
    aggregatable: false,
    rangeType: 'int',
  },
  fileSize: {
    dbCols: ['fileSize'],
    displayed: false,
    displayName: 'File size',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['fileSize'],
    sortReverse: true,
    aggregatable: false,
    rangeType: 'int',
  },
  startAt: {
    dbCols: ['startAt'],
    displayed: false,
    displayName: 'Start at',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['startAt'],
    aggregatable: false,
    formatter: formatDuration,
    rangeType: 'duration',
  },
  stopAt: {
    dbCols: ['stopAt'],
    displayed: false,
    displayName: 'Stop at',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['stopAt'],
    aggregatable: false,
    formatter: formatDuration,
    rangeType: 'duration',
  },
  lastPlayed: {
    dbCols: ['lastPlayed'],
    displayed: true,
    displayName: 'Last played',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['lastPlayed'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDateTime,
    rangeType: 'date',
  },
  createdAt: {
    dbCols: ['createdAt'],
    displayed: false,
    displayName: 'Created at',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['createdAt'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDateTime,
    rangeType: 'date',
  },
  updatedAt: {
    dbCols: ['updatedAt'],
    displayed: false,
    displayName: 'Updated at',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['updatedAt'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDateTime,
    rangeType: 'date',
  },
};

export class Track {
  album?: string;
  albumArtist?: string;
  artist?: string;
  bitrate?: number;
  comments?: string;
  compilation?: boolean;
  composer?: string;
  createdAt?: DateTime | number;
  discI?: number;
  discN?: number;
  duration?: number;
  fileSize?: number;
  genre?: string;
  genreCat?: string;
  genreColor?: string;
  grouping?: string;
  id?: string;
  ix?: number;
  lastPlayed?: DateTime | number;
  nPlays?: number;
  rating?: number;
  startAt?: number;
  stopAt?: number;
  title?: string;
  trackI?: number;
  trackN?: number;
  updatedAt?: DateTime | number;
  year?: number;
  cached?: boolean;

  constructor(rec: Record<string, any>) {
    if (rec.id != null) {
      this.id = rec.id;
      this.cached = cachedTrackIds.get().has(rec.id);
    }

    if (rec.album != null) this.album = rec.album;
    if (rec.albumArtist != null) this.albumArtist = rec.albumArtist;
    if (rec.artist != null) this.artist = rec.artist;
    if (rec.bitrate != null) this.bitrate = rec.bitrate;
    if (rec.comments != null) this.comments = rec.comments;
    if (rec.compilation != null) this.compilation = rec.compilation;
    if (rec.composer != null) this.composer = rec.composer;
    if (rec.discI != null) this.discI = rec.discI;
    if (rec.discN != null) this.discN = rec.discN;
    if (rec.duration != null) this.duration = rec.duration;
    if (rec.fileSize != null) this.fileSize = rec.fileSize;
    if (rec.genre != null) this.genre = rec.genre;
    if (rec.genreCat != null) this.genreCat = rec.genreCat;
    if (rec.genreColor != null) this.genreColor = rec.genreColor;
    if (rec.grouping != null) this.grouping = rec.grouping;
    if (rec.ix != null) this.ix = rec.ix;
    if (rec.nPlays != null && rec.nPlays !== 0) this.nPlays = rec.nPlays;
    if (rec.rating != null) this.rating = rec.rating;
    if (rec.startAt != null) this.startAt = rec.startAt;
    if (rec.stopAt != null) this.stopAt = rec.stopAt;
    if (rec.title != null) this.title = rec.title;
    if (rec.trackI != null) this.trackI = rec.trackI;
    if (rec.trackN != null) this.trackN = rec.trackN;
    if (rec.year != null) this.year = rec.year;

    if (rec.createdAt != null) {
      this.createdAt = DateTime.fromMillis(Number(BigInt(rec.createdAt)));
    }

    if (rec.lastPlayed != null) {
      this.lastPlayed = DateTime.fromMillis(Number(BigInt(rec.lastPlayed)));
    }

    if (rec.updatedAt != null) {
      this.updatedAt = DateTime.fromMillis(Number(BigInt(rec.updatedAt)));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getStaticProperty(propertyName: string): any {
    return (this as Indexable)[propertyName];
  }
}

export class TrackSettings extends TabSettings<Track> {
  constructor() {
    super({
      tabFields: { ...trackFields },
      tabName: 'track',
      sortBy: { col: 'artist', asc: true },
      queryName: 'tracksInPlaylist',
      staticAggs: 'aggregates { sum { duration } }',
    });
  }

  recordCreator(r: Record<string, any>): Track {
    return new Track(r);
  }

  statsContentCreator(resp: any): string {
    const count: number = resp[this.queryName].totalCount;
    let content = count === 1 ? `${count} track` : `${count} tracks`;

    if (resp[this.queryName].aggregates?.sum?.duration != null) {
      const totalDuration: number = parseInt(
        resp[this.queryName].aggregates.sum.duration
      );
      content = [content, formatDuration(totalDuration)].join(' · ');
    }

    return content;
  }
}

export async function trackExists(id: string): Promise<boolean> {
  const q = `
      query trackExists($id: String!) {
        track(id: $id) {
          id
        }
      }
  `;

  const res: any = await db(q, { id: id });
  return res.track != null;
}

export async function insertTracks(tracks: Track[]): Promise<void> {
  const q = `
    mutation insertTracks($tracks: [TrackInput]!) {
      createTracks(input: { _tracks: $tracks }) {
        clientMutationId
      }
    }
  `;

  await db(q, { tracks: tracks });
}

export async function updateTracks(
  patch: Record<string, any>[],
  queueable = false
): Promise<void> {
  const q = `
    mutation updateTracks($mnPatch: [TrackPatch!]) {
      mnUpdateTrack(input: { mnPatch: $mnPatch }) {
        clientMutationId
      }
    }
  `;

  await db(q, { mnPatch: patch }, queueable);
}

export async function getStarredTracks(): Promise<{
  stats: GcrDuration[];
  tracks: Track[];
}> {
  const q = `
    query getStarred {
      starredStats(orderBy: [GENRE_CAT_ASC, RATING_ASC]) {
        nodes {
          duration
          genreCat
          rating
        }
      }

      tracks(
        filter: {
          rating: { isNull: false },
          genreCat: { isNull: false }
        }
        orderBy: [GENRE_CAT_ASC, RATING_ASC, GROUPING_ASC, TRACK_I_ASC]
      ) {
        nodes {
          id
          grouping
          genreCat
          rating
          duration
          nPlays
          lastPlayed
        }
      }
    }
  `;

  const res: any = await db(q, {});

  return {
    stats: res.starredStats.nodes,
    tracks: res.tracks.nodes.map((t: Record<string, any>): Track => {
      const obj: Record<string, any> = { ...t };

      obj.lastPlayed = DateTime.fromMillis(
        Number(BigInt(obj.lastPlayed ?? '0')),
        {
          zone: 'UTC',
        }
      );

      return obj as Track;
    }),
  };
}

export async function deleteTrack(id: string): Promise<void> {
  const q = `
    mutation deleteTrack($id: String!) {
      deleteTrack(input: { id: $id }) {
        clientMutationId
      }
    }
  `;

  await db(q, { id: id });
}

export async function autocompleteTag(
  colName: string,
  tagValue: string,
  n: number
): Promise<string[]> {
  const q = `
    query AutocompleteTag($tagValue: String, $first: Int) {
      tracks(
        filter: {${colName}: {matchUnaccentInsensitive: $tagValue}}
        first: $first
      ) {
        groupedAggregates(groupBy: ${camelToScreamingSnakeCase(colName)}) {
          keys
        }
      }
    }
  `;

  const res: any = await db(q, {
    tagValue: `\\m${tagValue}`,
    first: n,
  });

  return res.tracks.groupedAggregates
    .slice(0, n)
    .map((x: { keys: string[] }): string => x.keys[0]);
}

export async function getAllGenreNames(): Promise<string[]> {
  const q = `
    query GenreNames {
      tracks(filter: { genre: { isNull: false } }) {
        groupedAggregates(groupBy: GENRE) {
          keys
        }
      }
    }
  `;

  const res: any = await db(q, {});

  return res.tracks.groupedAggregates.map(
    (x: { keys: string[] }): string => x.keys[0]
  );
}

export async function getAllArtistGenres(): Promise<
  Map<string, ImportArtistGenre>
> {
  const q = `
    query ArtistGenres {
      tracks(filter: {
        artist: { isNull: false }
        genre: { isNull: false, notEndsWith: "Compilation" }
      }) {
        groupedAggregates(groupBy: [ARTIST, GENRE]) {
          keys
        }
      }
    }
  `;

  const res: any = await db(q, {});

  return new Map(
    res.tracks.groupedAggregates.map(
      (x: { keys: [string, string] }): [string, ImportArtistGenre] => {
        return [
          normString(x['keys'][0]),
          {
            artist: x['keys'][0],
            genre: x['keys'][1],
          },
        ];
      }
    )
  );
}
