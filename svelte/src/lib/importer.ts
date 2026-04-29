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
import { writable, type Writable } from './tansuStore';

type Presign = { fields: any; url: string };

const startingStateCounts: Record<ImportState, number> = {
  todo: 0,
  uploading: 0,
  success: 0,
  retrying: 0,
  failed: 0,
};

export const stateCounts: Writable<Record<ImportState, number>> =
  writable(startingStateCounts);

export const importingMp3s: Writable<Map<string, ImportingMp3>> = writable(
  new Map<string, ImportingMp3>()
);

importingMp3s.subscribe((theImportingMp3s: Map<string, ImportingMp3>): void => {
  const sc: Record<ImportState, number> = { ...startingStateCounts };

  for (const impMp3 of theImportingMp3s.values()) {
    sc[impMp3.state]++;
  }

  stateCounts.set(sc);
});

type QueueItem = {
  file: File;
  state: ImportState;
  failureCount: number;
  failureMsg?: string;
  track?: Track;
};

export function importTracks(
  files: File[],
  artistGenres: Map<string, ImportArtistGenre>
): void {
  ImportQueue.enqueue(files, artistGenres);
}

export class ImportQueue {
  private static queue: Map<string, QueueItem> = new Map();
  private static activeCount = 0;

  private static readonly maxConcurrent = 3;
  private static retryDelay = 500; // ms
  private static maxDelay = 25000; // 25s

  private static processing = false;

  public static enqueue(
    files: File[],
    artistGenres: Map<string, ImportArtistGenre>
  ): void {
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.mp3')) continue;

      if (!ImportQueue.queue.has(file.name)) {
        ImportQueue.queue.set(file.name, {
          file,
          state: 'todo',
          failureCount: 0,
        });
      }
    }

    importingMp3s.set(ImportQueue.queue);
    void ImportQueue.process(artistGenres);
  }

  private static async process(
    artistGenres: Map<string, ImportArtistGenre>
  ): Promise<void> {
    if (ImportQueue.processing) return;
    ImportQueue.processing = true;

    try {
      while (true) {
        // fill available worker slots
        while (
          ImportQueue.activeCount < ImportQueue.maxConcurrent &&
          ImportQueue.hasPending()
        ) {
          const next = ImportQueue.nextItem();
          if (!next) break;

          ImportQueue.startItem(next, artistGenres);
        }

        if (!ImportQueue.hasPending() && ImportQueue.activeCount === 0) {
          logMessage('Done importing MP3 files', 'success');
          break;
        }

        // wait briefly before checking again (not polling work, just coordination)
        await new Promise((r) => setTimeout(r, 100));
      }
    } finally {
      ImportQueue.processing = false;
    }
  }

  private static hasPending(): boolean {
    for (const item of ImportQueue.queue.values()) {
      if (item.state === 'todo' || item.state === 'retrying') return true;
    }
    return false;
  }

  private static nextItem(): [string, QueueItem] | null {
    for (const entry of ImportQueue.queue.entries()) {
      const [, item] = entry;
      if (item.state === 'todo' || item.state === 'retrying') {
        return entry;
      }
    }
    return null;
  }

  private static startItem(
    [key, item]: [string, QueueItem],
    artistGenres: Map<string, ImportArtistGenre>
  ): void {
    item.state = 'uploading';
    ImportQueue.activeCount++;
    importingMp3s.set(ImportQueue.queue);

    ImportQueue.runItem(key, item, artistGenres)
      .then((track) => {
        item.state = 'success';
        item.track = track;
        ImportQueue.retryDelay = 500; // reset backoff
      })
      .catch((e: unknown) => {
        if (e instanceof Error) {
          item.failureMsg = e.message;

          if (e.message.includes('already exists') || item.failureCount >= 3) {
            item.state = 'failed';
          } else {
            item.state = 'retrying';
            item.failureCount++;
          }
        }
      })
      .finally(() => {
        ImportQueue.activeCount--;
        importingMp3s.set(ImportQueue.queue);

        if (item.state === 'retrying') {
          ImportQueue.scheduleRetry(artistGenres);
        }
      });
  }

  private static scheduleRetry(
    artistGenres: Map<string, ImportArtistGenre>
  ): void {
    ImportQueue.retryDelay = Math.min(
      ImportQueue.maxDelay,
      ImportQueue.retryDelay * 1.5
    );

    window.setTimeout(() => {
      void ImportQueue.process(artistGenres);
    }, ImportQueue.retryDelay);
  }

  private static async runItem(
    key: string,
    item: QueueItem,
    artistGenres: Map<string, ImportArtistGenre>
  ): Promise<Track> {
    const file = item.file;

    const presign = await preSignUpload(file);
    await uploadToS3(presign, file);

    const tags = await fingerprintAndGetId3Tags(file);

    const track = applyId3Tags(
      tags,
      file.size,
      // @ts-ignore
      file.filepath,
      artistGenres
    );

    await insertTracks([track]);

    const importPlaylist: Playlist = playlists
      .get()
      .find((p) => p.name === 'Import')!;

    await appendTracksToPlaylist(importPlaylist, [track.id!], false);

    return track;
  }

  public static remove(filename: string): void {
    ImportQueue.queue.delete(filename);
    importingMp3s.set(ImportQueue.queue);
  }

  public static clean(): void {
    for (const [k, v] of ImportQueue.queue) {
      if (v.state === 'success') ImportQueue.queue.delete(k);
    }
    importingMp3s.set(ImportQueue.queue);
  }
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
