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
  formatDate,
  formatDuration,
  type TabField,
  TabSettings,
} from '../../internal';

export const albumFields: Record<string, TabField> = {
  album: {
    dbCols: ['album'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Album',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['album', 'albumArtist'],
    aggregatable: false,
    globallySearchable: true,
  },
  albumArtist: {
    dbCols: ['albumArtist'],
    displayed: true,
    mobileDisplayed: true,
    displayName: 'Artist',
    truncatable: true,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['albumArtist', 'album'],
    aggregatable: true,
    globallySearchable: true,
  },
  genre: {
    dbCols: ['genre', 'genreColor'],
    displayed: true,
    mobileDisplayed: false,
    displayName: 'Genre',
    truncatable: false,
    numeric: false,
    filterType: 'text',
    sortable: true,
    sortCols: ['genre', 'albumArtist', 'album'],
    aggregatable: true,
  },
  year: {
    dbCols: ['year'],
    displayed: true,
    mobileDisplayed: false,
    displayName: 'Year',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['year', 'albumArtist', 'album'],
    sortReverse: true,
    aggregatable: false,
    rangeType: 'int',
  },
  createdAt: {
    dbCols: ['createdAt'],
    displayed: true,
    mobileDisplayed: false,
    displayName: 'Created at',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['createdAt', 'albumArtist', 'album'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDate,
    rangeType: 'date',
  },
  nTracks: {
    dbCols: ['nTracks'],
    displayed: true,
    mobileDisplayed: false,
    displayName: '# tracks',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['nTracks', 'albumArtist', 'album'],
    sortReverse: true,
    aggregatable: false,
    rangeType: 'int',
  },
  totalDuration: {
    dbCols: ['totalDuration'],
    displayed: true,
    mobileDisplayed: false,
    displayName: 'Duration',
    truncatable: false,
    numeric: true,
    filterType: 'range',
    sortable: true,
    sortCols: ['totalDuration', 'albumArtist', 'album'],
    sortReverse: true,
    aggregatable: false,
    formatter: formatDuration,
    rangeType: 'duration',
  },
};

export class Album {
  albumArtist: string;
  album: string;
  genre?: string;
  genreColor?: string;
  year?: number;
  createdAt: DateTime;
  nTracks: number;
  totalDuration: number;

  constructor(rec: Record<string, any>) {
    this.albumArtist = rec.albumArtist;
    this.album = rec.album;
    if (rec.genre != null) this.genre = rec.genre;
    if (rec.genreColor != null) this.genreColor = rec.genreColor;
    if (rec.year != null) this.year = rec.year;
    this.createdAt = DateTime.fromMillis(Number(BigInt(rec.createdAt)), {
      zone: 'UTC',
    });
    this.nTracks = rec.nTracks;
    this.totalDuration = rec.totalDuration;
  }
}

export class AlbumSettings extends TabSettings<Album> {
  constructor() {
    super({
      tabFields: { ...albumFields },
      tabName: 'album',
      sortBy: { col: 'albumArtist', asc: true },
      queryName: 'albums',
    });
  }

  recordCreator(r: Record<string, any>): Album {
    return new Album(r);
  }

  statsContentCreator(resp: any): string {
    const count: number = resp[this.queryName].totalCount;
    return count === 1 ? `${count} album` : `${count} albums`;
  }
}

export async function getAlbumTrackIds(
  albumArtist: string,
  albumTitle: string
): Promise<string[]> {
  const q = `
    query AlbumTracks($albumArtist: String, $album: String) {
      tracks(
        filter: {
          albumArtist: {equalTo: $albumArtist},
          album: {equalTo: $album}
        }
        orderBy: [DISC_I_ASC, TRACK_I_ASC]
      ) {
        nodes {
          id
        }
      }
    }
  `;

  const res: any = await db(q, { albumArtist: albumArtist, album: albumTitle });
  return res.tracks.nodes.map((t: Record<string, any>): string => t.id);
}
