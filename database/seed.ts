import { promisify } from 'bluebird';
import { AllHtmlEntities } from 'html-entities';
import lineReader from 'line-reader';
import fingerprints from '../../data/hashes.json';
import { readFileSync } from 'fs';

const pg = require('pg');
require('pg-essential').patch(pg);
const parse = require('pg-connection-string').parse;

require('dotenv').config();

const libraryXmlPath: string = 'path/to/Library.xml';
const playlistsToKeep: string[] = ['Playlist 1'];

class DbTrack {
  album: string | null = null;
  album_artist: string | null = null;
  artist: string | null = null;
  bitrate: number | null = null;
  comments: string | null = null;
  compilation: boolean | null = null;
  composer: string | null = null;
  created_at: Date | null = null;
  disc_i: number | null = null;
  disc_n: number | null = null;
  duration: number | null = null;
  file_size: number | null = null;
  genre: string | null = null;
  grouping: string | null = null;
  id: string | null = null;
  last_played: Date | null = null;
  n_plays: number | null = null;
  rating: number | null = null;
  start_at: number | null = null;
  stop_at: number | null = null;
  title: string | null = null;
  track_i: number | null = null;
  track_n: number | null = null;
  updated_at: Date | null = null;
  year: number | null = null;
}

let dbUrl: string;

if (process.argv[2] === 'prod') {
  throw "don't do that again";
  dbUrl = process.env.PROD_DATABASE_URL!;
  pg.defaults.ssl = true;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else {
  dbUrl = process.env.DATABASE_URL!;
}

const client: any = new pg.Client(parse(dbUrl));

client.connect().then(() => {
  const schema: string = readFileSync('schema.sql').toString();
  client.query(schema);
});

const tracks: Record<string, DbTrack> = {};
let track: DbTrack;
let trackId: string;
const otherKeys = new Set<string>();

let insideTracks: boolean = false;
let insideTrack = false;

const playlists: Record<string, any>[] = [];
let playlist: Record<string, any>;
const playlistTracks: Record<string, unknown>[] = [];

let insidePlaylists: boolean = false;
let insidePlaylist = false;

const keyRegex = new RegExp('<key>(?<key>.+)</key>');
const valueRegex = new RegExp(
  '<(string|integer|date)>(?<value>.+)</(string|integer|date)>'
);
const playlistNameRegex = new RegExp(
  '<key>Name</key><string>(?<value>.+)</string>'
);
const playlistItemRegex = new RegExp('<integer>(?<value>.+)</integer>');

let playlistId: number = 2;
let playlistTrackIx: number = 0;

function processLine(line: string): void {
  if (line === '	<key>Tracks</key>') {
    insideTracks = true;
  } else if (insideTracks) {
    if (line === '		<dict>') {
      insideTrack = true;

      track = new DbTrack();
      track.compilation = false;
      track.n_plays = 0;
    } else if (line === '	</dict>') {
      insideTracks = false;
    } else if (insideTrack) {
      if (line === '		</dict>') {
        // done with track
        insideTrack = false;
        tracks[trackId] = track;
      } else {
        // add to track object

        const key: string = line!.match(keyRegex)!.groups!.key;

        switch (key) {
          case 'Album':
            track.album = AllHtmlEntities.decode(
              line!
                .match(valueRegex)!
                .groups!.value.replace(/[\s\t]+/g, ' ')
                .trim()
            );
            break;

          case 'Album Artist':
            track.album_artist = AllHtmlEntities.decode(
              line!
                .match(valueRegex)!
                .groups!.value.replace(/[\s\t]+/g, ' ')
                .trim()
            );
            break;

          case 'Artist':
            track.artist = AllHtmlEntities.decode(
              line!
                .match(valueRegex)!
                .groups!.value.replace(/[\s\t]+/g, ' ')
                .trim()
            );
            break;

          case 'Bit Rate':
            track.bitrate = parseInt(line!.match(valueRegex)!.groups!.value);
            break;

          case 'Composer':
            track.composer = AllHtmlEntities.decode(
              line!
                .match(valueRegex)!
                .groups!.value.replace(/[\s\t]+/g, ' ')
                .trim()
            );
            break;

          case 'Comments':
            track.comments = AllHtmlEntities.decode(
              line!.match!(valueRegex)!.groups!.value
            );
            break;

          case 'Compilation':
            track.compilation = true;
            break;

          case 'Date Added':
            track.created_at = new Date(
              line!.match!(valueRegex)!.groups!.value
            );
            break;

          case 'Date Modified':
            track.updated_at = new Date(
              line!.match!(valueRegex)!.groups!.value
            );
            break;

          case 'Disc Count':
            track.disc_n = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Disc Number':
            track.disc_i = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Genre':
            track.genre = line!
              .match(valueRegex)!
              .groups!.value.replace(/[\s\t]+/g, ' ')
              .trim();
            break;

          case 'Grouping':
            track.grouping = AllHtmlEntities.decode(
              line!
                .match(valueRegex)!
                .groups!.value.replace(/[\s\t]+/g, ' ')
                .trim()
            );
            break;

          case 'Name':
            track.title = AllHtmlEntities.decode(
              line!
                .match(valueRegex)!
                .groups!.value.replace(/[\s\t]+/g, ' ')
                .trim()
            );
            break;

          case 'Track ID':
            trackId = line!.match!(valueRegex)!.groups!.value;
            break;

          case 'Persistent ID':
            // @ts-ignore
            track.id = fingerprints[trackId];
            break;

          case 'Play Count':
            track.n_plays = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Play Date UTC':
            track.last_played = new Date(
              line!.match!(valueRegex)!.groups!.value
            );
            break;

          case 'Rating':
            const rating =
              parseInt(line!.match!(valueRegex)!.groups!.value) / 20;

            if ([3, 4, 5].includes(rating)) {
              track.rating = rating - 2;
            }

            break;

          case 'Start Time':
            track.start_at = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Size':
            track.file_size = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Stop Time':
            track.stop_at = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Total Time':
            track.duration = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Track Count':
            track.track_n = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Track Number':
            track.track_i = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          case 'Year':
            track.year = parseInt(line!.match!(valueRegex)!.groups!.value);
            break;

          default:
            otherKeys.add(key);
            break;
        }
      }
    }
  } else if (line === '	<key>Playlists</key>') {
    // starting playlists now
    insidePlaylists = true;
  } else if (insidePlaylists) {
    if (line.substr(0, 18) === '			<key>Name</key>') {
      // starting particular playlist
      const name = line!.match(playlistNameRegex)!.groups!.value;

      if (playlistsToKeep.includes(name)) {
        // this is a playlist to import
        insidePlaylist = true;
        playlist = {
          id: playlistId,
          name: name,
          sort_col: 'ix',
          sort_asc: true,
          ix: playlistId
        };
      }
    } else if (line === '	</dict>') {
      // completely done with all playlists
      insidePlaylists = false;
    } else if (insidePlaylist) {
      // processing playlist tracks
      if (line.substr(0, 18) === '					<key>Track ID') {
        const trackId: string = line!.match(playlistItemRegex)!.groups!.value;

        playlistTracks.push({
          playlist_id: playlist.id,
          track_id: tracks[trackId].id!,
          ix: playlistTrackIx
        });

        playlistTrackIx++;
      } else if (line === '		</dict>') {
        // done with particular playlist
        insidePlaylist = false;
        playlists.push(playlist);
        playlistId++;
        playlistTrackIx = 0;
      }
    }
  }
}

const eachLine: () => unknown = promisify(lineReader.eachLine);

async function bulkImport(
  tracks: DbTrack[],
  playlists: Record<string, any>[],
  playlistTracks: Record<string, unknown>[]
): Promise<void> {
  playlists.push({
    id: 1,
    name: 'All',
    sort_col: 'artist',
    sort_asc: true,
    ix: 1
  });

  await client.executeBulkInsertion(
    playlists,
    Object.keys(playlists[0]),
    'playlists'
  );

  await client.query(`
    SELECT pg_catalog.setval(
      pg_get_serial_sequence('playlists', 'id'),
      MAX(id) + 1
    ) FROM playlists;
  `);

  await client.executeBulkInsertion(tracks, Object.keys(tracks[0]), 'tracks');

  await client.executeBulkInsertion(
    playlistTracks,
    Object.keys(playlistTracks[0]),
    'playlist_tracks'
  );
}

// @ts-ignore
eachLine(libraryXmlPath, (line: string): void => {
  processLine(line);
})
  .then(() => {
    return bulkImport(Object.values(tracks), playlists, playlistTracks);
  })
  .catch((err: any) => {
    console.log(err);
  })
  .finally(() => client.end());
