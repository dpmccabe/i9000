import { clear, del, entries, get as getIdb, set as setIdb } from 'idb-keyval';
import {
  allPlaylistName,
  appSettings,
  cachedTrackIds,
  currentPlaylist,
  logMessage,
  type Playlist,
  selectedTrackIds,
  type TabResults,
  type Track,
  trackResults,
} from '../../internal';

cachedTrackIds.subscribe((ctids: Set<string>): void => {
  trackResults.update(
    (
      theTrackResult: TabResults<Track> | undefined
    ): TabResults<Track> | undefined => {
      if (theTrackResult?.results != null) {
        theTrackResult.results = theTrackResult.results.map(
          (t: Track): Track => {
            if (ctids.has(t.id!)) t.cached = true;
            return t;
          }
        );
      }

      return theTrackResult;
    }
  );
});

export async function getOfflineMp3s(): Promise<string[]> {
  const cachedMp3s: [IDBValidKey, never][] = await entries();
  return cachedMp3s.map((x: IDBValidKey[] | never): string => {
    return x[0] as string;
  });
}

async function cacheMp3(track: Track): Promise<void> {
  if (cachedTrackIds.get().has(track.id!)) {
    logMessage(`"${track.title!}" already cached`);
    return;
  }

  const url: string = appSettings.get().cloudfrontUrl!.replace('*', track.id!);

  logMessage(`Caching "${track.title!}"&hellip;`);

  try {
    const resp: Response = await fetch(url, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

    await setIdb(track.id!, await resp.blob());

    const offlineMp3s: string[] = await getOfflineMp3s();
    cachedTrackIds.set(new Set(offlineMp3s));
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(`Error caching "${track.title!}": ${e.message}`, 'error');
    } else {
      console.error(e);
    }
  }

  logMessage(`Cached "${track.title!}"`, 'success');
}

export async function uncacheMp3(track: Track): Promise<void> {
  await del(track.id!);
  cachedTrackIds.set(new Set(await getOfflineMp3s()));
  logMessage(`Uncached "${track.title!}"`, 'success');
}

export async function getCachedMp3(trackId: string): Promise<Blob | undefined> {
  return await getIdb(trackId);
}

export async function clearMp3Cache(): Promise<void> {
  await clear();
  cachedTrackIds.set(new Set(await getOfflineMp3s()));
}

export async function cacheSelectedOrPlaylist(
  nHours: number = 0
): Promise<void> {
  const selTrackIds: Set<string> = selectedTrackIds.get();
  const tracks: Track[] = trackResults.get()!.results;
  const nMaxCached = 1000;
  const nSecondsNeeded = nHours * 60 * 60 * 1000;
  let nSecondsCached = 0;

  if (selTrackIds.size > nMaxCached) {
    throw Error(`Cannot cache ${selTrackIds.size} tracks (max=${nMaxCached})`);
  } else if (selTrackIds.size > 0) {
    for (const trackId of selTrackIds) {
      const track: Track = tracks.find((t: Track): boolean => {
        return t.id === trackId;
      })!;
      await cacheMp3(track);
    }
  } else {
    const playlist: Playlist = currentPlaylist.get()!;

    if (playlist.name === allPlaylistName) {
      throw Error('Can\'t cache playlist "All"');
    } else {
      if (tracks.length > nMaxCached) {
        throw Error(`Cannot cache ${tracks.length} tracks (max=${nMaxCached})`);
      } else {
        for (const t of tracks) {
          if (nSecondsNeeded === 0 || nSecondsCached < nSecondsNeeded) {
            nSecondsCached += t.duration!;
            await cacheMp3(t);
          }
        }
      }
    }
  }
}
