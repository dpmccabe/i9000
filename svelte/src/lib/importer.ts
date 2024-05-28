import { DateTime } from 'luxon';
import {
  appendTracksToPlaylist,
  appSettings,
  type ImportArtistGenre,
  type ImportingMp3,
  type ImportState,
  insertTracks,
  logMessage,
  normString,
  type Playlist,
  playlists,
  Track,
  trackExists,
  trimWithin,
} from '../internal';
import { derived, type Readable, writable, type Writable } from './tansuStore';

type Presign = { fields: any; url: string };

const maxConcurrentImports = 3;
const startingStateCounts: Record<ImportState, number> = {
  todo: 0,
  uploading: 0,
  success: 0,
  retrying: 0,
  failed: 0,
};

export const importingMp3s: Writable<Map<string, ImportingMp3>> = writable(
  new Map<string, ImportingMp3>()
);
export const stateCounts: Readable<Record<ImportState, number>> = derived(
  importingMp3s,
  (
    theImportingMp3s: Map<string, ImportingMp3>
  ): Record<ImportState, number> => {
    console.log('theImportingMp3s', theImportingMp3s);
    const sc: Record<ImportState, number> = { ...startingStateCounts };

    for (const impMp3 of theImportingMp3s.values()) {
      sc[impMp3.state]++;
    }

    return sc;
  },
  startingStateCounts
);
let importingFn: number | null = null;

export function importTracks(
  files: File[],
  artistGenres: Map<string, ImportArtistGenre>
): void {
  const impMap = new Map<string, ImportingMp3>();

  for (const file of files) {
    if (
      file.type === 'audio/mpeg' &&
      file.name.toLowerCase().endsWith('.mp3')
    ) {
      impMap.set(file.name, { file: file, state: 'todo', failureCount: 0 });
    }
  }

  if (impMap.size === 0) {
    logMessage('No MP3 files', 'error');
    return;
  }

  importingMp3s.update(
    (currentImpMap: Map<string, ImportingMp3>): Map<string, ImportingMp3> => {
      return new Map([...currentImpMap, ...impMap]);
    }
  );

  importingFn ||= window.setInterval(processImportQueue, 500, artistGenres);
}

function processImportQueue(
  artistGenres: Map<string, ImportArtistGenre>
): void {
  let nextImportKey: null | string = null;

  for (const [filename, impMp3] of importingMp3s.get()!) {
    if (nextImportKey == null && ['todo', 'retrying'].includes(impMp3.state)) {
      nextImportKey = filename;
    }
  }

  if (
    stateCounts.get().todo +
      stateCounts.get().uploading +
      stateCounts.get().retrying ===
    0
  ) {
    logMessage('Done importing MP3s files', 'success');
    clearImportingFn();
  } else if (
    nextImportKey != null &&
    stateCounts.get().uploading < maxConcurrentImports
  ) {
    importingMp3s.update(
      (im: Map<string, ImportingMp3>): Map<string, ImportingMp3> => {
        im.get(nextImportKey!)!.state = 'uploading';
        return im;
      }
    );

    importSingleTrack(
      importingMp3s.get()!.get(nextImportKey)!.file,
      artistGenres
    )
      .then((track: Track): void => {
        importingMp3s.update(
          (im: Map<string, ImportingMp3>): Map<string, ImportingMp3> => {
            im.get(nextImportKey!)!.state = 'success';
            im.get(nextImportKey!)!.track = track;
            return im;
          }
        );
      })
      .catch((e: unknown): void => {
        if (e instanceof Error) {
          importingMp3s.update(
            (im: Map<string, ImportingMp3>): Map<string, ImportingMp3> => {
              if (
                e.message.includes('already exists') ||
                im.get(nextImportKey!)!.failureCount === 3
              ) {
                im.get(nextImportKey!)!.state = 'failed';
              } else {
                im.get(nextImportKey!)!.state = 'retrying';
                im.get(nextImportKey!)!.failureCount++;
              }

              im.get(nextImportKey!)!.failureMsg = e.message;
              return im;
            }
          );
        } else {
          console.log(e);
        }
      });
  }
}

async function importSingleTrack(
  file: File,
  artistGenres: Map<string, ImportArtistGenre>
): Promise<Track> {
  const presign = await preSignUpload(file);
  await uploadToS3(presign, file);
  const tags = await fingerprintAndGetId3Tags(file);

  const track: Track = applyId3Tags(
    tags,
    file.size,
    // @ts-ignore
    file.filepath,
    artistGenres
  );

  await insertTracks([track]);

  const importPlaylist: Playlist = playlists
    .get()
    .find((p: Playlist): boolean => p.name === 'Import')!;

  await appendTracksToPlaylist(importPlaylist, [track.id!], false);
  return track;
}

async function preSignUpload(file: File): Promise<Presign> {
  // get presigned URL for upload
  const url: string = [appSettings.get().apiUrl, 'tracks', 'presign'].join('/');

  const res: Response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': appSettings.get().apiKey!,
    },
    body: JSON.stringify({ filename: file.name }),
  });

  return await res.json();
}

async function uploadToS3(presign: Presign, file: File): Promise<void> {
  // upload file directly to S3
  const formData: FormData = new FormData();

  Object.keys(presign.fields).forEach((key: string): void => {
    formData.append(key, presign.fields[key]);
  });

  formData.append('file', file);
  formData.append('Content-Type', file.type);

  await fetch(presign.url, {
    method: 'POST',
    body: formData,
    headers: { accept: 'application/xml' },
  });
}

async function fingerprintAndGetId3Tags(
  file: File
): Promise<Record<string, any>> {
  // fingerprint and get ID3 tags
  const url: string = [appSettings.get().apiUrl, 'tracks', 'import'].join('/');

  const res: Response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': appSettings.get().apiKey!,
    },
    body: JSON.stringify({ filename: file.name }),
  });

  if (!res.ok) throw Error(res.statusText);

  // set tags on track object and insert to DB
  const tags: Record<string, any> = await res.json();

  if (tags.already_exists && (await trackExists(tags.id))) {
    throw Error(`${tags.id} already exists in database`);
  }

  return tags;
}

function applyId3Tags(
  tags: Record<string, number | string>,
  fileSize: number,
  filePath: string,
  artistGenres: Map<string, ImportArtistGenre>
): Track {
  const now: number = DateTime.now().toMillis();

  const track: Track = new Track({});
  track.id = tags.id as string;
  track.duration = Math.round((tags.duration as number) * 1000);
  track.bitrate = tags.bitrate as number;
  track.fileSize = fileSize;
  track.createdAt = now;
  track.updatedAt = now;
  track.compilation = false;
  track.comments = filePath;
  track.title = filePath.substring(0, filePath.length - 4);

  let trackParts: string[];
  let discParts: string[];

  if ('artist' in tags || 'albumartist' in tags) {
    track.artist = trimWithin(
      (tags.artist ?? tags.albumartist) as string
    ).normalize('NFC');
    track.albumArtist = trimWithin(
      (tags.albumartist ?? tags.artist) as string
    ).normalize('NFC');
  }

  if ('album' in tags)
    track.album = trimWithin(tags.album as string).normalize('NFC');
  if ('composer' in tags)
    track.composer = trimWithin(tags.composer as string).normalize('NFC');
  if ('title' in tags)
    track.title = trimWithin(tags.title as string).normalize('NFC');
  if ('compilation' in tags) track.compilation = tags.compilation === '1';
  if ('date' in tags) track.year = parseInt(tags.date as string);

  if ('tracknumber' in tags) {
    // track number might appear as e.g. "1/10"
    trackParts = (tags.tracknumber as string).split('/');

    if (trackParts.length === 1) {
      track.trackI = parseInt(trackParts[0]);
    } else if (trackParts.length === 2) {
      track.trackI = parseInt(trackParts[0]);
      track.trackN = parseInt(trackParts[1]);
    }
  }

  if ('discnumber' in tags) {
    discParts = (tags.discnumber as string).split('/');

    if (discParts.length === 2 && discParts[0] !== discParts[1]) {
      track.discI = parseInt(discParts[0]);
      track.discN = parseInt(discParts[1]);
    }
  }

  if (track.artist != null) {
    const existingArtistGenre: ImportArtistGenre | undefined = artistGenres.get(
      normString(track.artist!)
    );

    if (existingArtistGenre != null) {
      track.artist = existingArtistGenre.artist;
      track.genre = existingArtistGenre.genre;
    } else if ('genre' in tags) {
      track.genre = trimWithin(tags.genre as string).normalize('NFC');

      if (
        [
          'Classique',
          'Chamber Music',
          'Contemporary',
          'Contemporary Classical',
          'Opera',
          'Orchestral',
        ].includes(track.genre!)
      ) {
        track.genre = 'Classical';
      } else if (
        new RegExp(
          [
            'Rock',
            'Pop',
            'Electro',
            'Alternative',
            'Soundtrack',
            'Indie',
            'Experimental',
            'Techno',
            'Trip',
            'Ambient',
          ].join('|'),
          'gi'
        ).test(track.genre!)
      ) {
        track.genre = 'Other';
      }
    }
  }

  return track;
}

export function clearImportingFn(): void {
  if (importingFn != null) {
    window.clearInterval(importingFn);
    importingFn = null;
  }
}

export function cleanImportQueue(): void {
  importingMp3s.update(
    (im: Map<string, ImportingMp3>): Map<string, ImportingMp3> => {
      for (const [filename, impMp3] of im) {
        if (impMp3.state === 'success') im.delete(filename);
      }

      return im;
    }
  );
}

export function removeFromImportQueue(filename: string): void {
  importingMp3s.update(
    (im: Map<string, ImportingMp3>): Map<string, ImportingMp3> => {
      im.delete(filename);
      return im;
    }
  );
}
