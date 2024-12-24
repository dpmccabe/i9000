import { DateTime } from 'luxon';
import {
  appSettings,
  audioElement,
  cachedTrackIds,
  canPlayNext,
  canPlayPrev,
  currentPlaylist,
  currentTime,
  DB,
  duration,
  getCachedMp3,
  getPlaylist,
  insertPlay,
  loadingNextAudioElement,
  localMp3FolderHandle,
  logMessage,
  markCheckFn,
  markedPlayed,
  mediaHandlersSet,
  nextAudioElement,
  paused,
  Play,
  playingPlaylist,
  playingPlaylistId,
  playingTrack,
  type Playlist,
  playlists,
  playQueue,
  queuePosition,
  type ScrobblePayload,
  selectedTrackIds,
  type TabResults,
  type TabSettingsQueryParam,
  type Track,
  trackResults,
  TrackSettings,
  updateTracks,
} from '../internal';
import { batch } from './tansuStore';

export async function initPlayer(): Promise<void> {
  if (!mediaHandlersSet.get()) setMediaHandlers();

  const savedPlayingPlaylistIdItem: string | null = localStorage.getItem(
    'playing-playlist-id'
  );
  const savedPlayingTrackId: string | null =
    localStorage.getItem('playing-track-id');

  if (savedPlayingPlaylistIdItem != null && savedPlayingTrackId != null) {
    const pPlaylistId: number = parseInt(savedPlayingPlaylistIdItem);
    const pPlaylist: Playlist = await getPlaylist(pPlaylistId);

    const tracks: Track[] = await getQueueTracks(pPlaylist);

    const pTrack: Track | undefined = tracks.find((t: Track): boolean => {
      return t.id === savedPlayingTrackId;
    });

    if (pTrack != null) {
      batch((): void => {
        playingPlaylistId.set(pPlaylistId);
        playQueue.set(tracks);
        playingTrack.set(pTrack);
      });

      await aePlay(1, parseFloat(localStorage.getItem('elapsed') ?? '0'));
    }
  }
}

export function setQueuePosition(
  $playQueue: Track[],
  $playingTrack: Track | null
): void {
  if ($playQueue.length === 0 || $playingTrack == null) {
    queuePosition.set(null);
    canPlayPrev.set(false);
    canPlayNext.set(false);
    return;
  }

  if ($playingTrack.ix == null) {
    // inside Songs
    queuePosition.set([0, $playQueue.length - 1]);
    canPlayPrev.set(false);
    canPlayNext.set(false);
  } else {
    queuePosition.set([$playingTrack.ix!, $playQueue.length - 1]);
    canPlayPrev.set(true);
    canPlayNext.set($playingTrack.ix! < $playQueue.length - 1);
  }
}

function setMediaHandlers(): void {
  const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', playOrPause],
    ['pause', playOrPause],
    ['previoustrack', prevTrack],
    ['nexttrack', nextTrack],
    ['stop', (): void => stopPlayback()],
    ['seekbackward', (): void => scrubRelative(-3)],
    ['seekforward', (): void => scrubRelative(3)],
    ['seekto', (d: MediaSessionActionDetails): void => scrubTo(d.seekTime!)],
  ];

  for (const [action, handler] of actionHandlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (e: unknown) {
      console.log(`The media session action "${action}" is not supported yet.`);
    }
  }

  mediaHandlersSet.set(true);
}

export async function jumpToQueuePosition(pos: number): Promise<void> {
  const nextTrack: Track = playQueue.get()[pos];
  playingTrack.set(nextTrack);
  await aePlay(1);
}

export async function startPlayingInPlaylist(
  specificTrack: Track | null = null
): Promise<void> {
  const tracks: Track[] = trackResults.get()!.results;

  const tracksSorted: Track[] = [...tracks].sort(
    (x: Track, y: Track): number => {
      return x.ix! - y.ix!;
    }
  );

  const trackToPlay: Track = specificTrack ?? tracksSorted[0];
  const curPlaylistId: number | null = currentPlaylist.get()?.id ?? null;

  batch((): void => {
    playingTrack.set(trackToPlay);

    if (curPlaylistId == null) {
      playQueue.set([trackToPlay]);
    } else {
      playingPlaylistId.set(curPlaylistId);
      playQueue.set(tracksSorted);
    }
  });

  await aePlay(1);

  if (curPlaylistId != null) {
    localStorage.setItem(
      'playing-playlist-id',
      String(currentPlaylist.get()!.id)
    );
  }
}

export async function playSelectedTrack(): Promise<void> {
  const selTids: Set<string> = selectedTrackIds.get();

  if (selTids.size > 0) {
    const firstSelTrackId: string = [...selTids][0];

    const firstSelTrack: Track = trackResults
      .get()!
      .results.find((t: Track): boolean => {
        return t.id === firstSelTrackId;
      })!;

    await startPlayingInPlaylist(firstSelTrack);
  }
}

export async function prevTrack(): Promise<void> {
  (document.activeElement as HTMLElement).blur();

  const ae: HTMLAudioElement = audioElement.get()!;
  const pTrack: Track | null = playingTrack.get();

  if (pTrack && (!canPlayPrev.get() || ae.currentTime >= 3)) {
    let startAt = 0;
    if (pTrack.startAt != null) startAt = pTrack.startAt / 1000;
    ae.currentTime = startAt;
    return;
  }

  if (!canPlayPrev.get()) return;

  const nextTrack: Track = playQueue.get()[queuePosition.get()![0] - 1];
  playingTrack.set(nextTrack);
  await aePlay(1);
}

export async function nextTrack(): Promise<void> {
  (document.activeElement as HTMLElement).blur();

  if (!canPlayNext.get()) return;

  const nextTrack: Track = playQueue.get()[queuePosition.get()![0] + 1];
  playingTrack.set(nextTrack);
  await aePlay(1);
}

function stopAudio(ae: HTMLAudioElement) {
  ae.pause();
  ae.currentTime = 0;
}

async function aePlay(
  attemptNo: number,
  resumePausedAt: number | null = null
): Promise<void> {
  resetPlayedChecker();

  const oldAe: HTMLAudioElement | null = audioElement.get();
  if (oldAe != null) stopAudio(oldAe);

  let ae: HTMLAudioElement | null = null;
  let nextAe: HTMLAudioElement | null = null;

  try {
    ae = new Audio();
    let mp3Src: string | null = null;

    const track: Track = playingTrack.get()!;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title ?? undefined,
        artist: track.artist ?? undefined,
        album: track.album ?? undefined,
        artwork: [
          { src: '/images/icon128.png', sizes: '128x128', type: 'image/png' },
          { src: '/images/icon192.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/icon256.png', sizes: '256x256', type: 'image/png' },
          { src: '/images/icon512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }

    if (localMp3FolderHandle.get() != null) {
      try {
        const localMp3FileHandle: FileSystemFileHandle =
          await localMp3FolderHandle
            .get()!
            .getFileHandle([track.id, 'mp3'].join('.'));

        const blob: Blob = await localMp3FileHandle.getFile();
        mp3Src = window.URL.createObjectURL(blob);
      } catch (e: unknown) {
        console.log('File not in local MP3 folder');
      }
    }

    if (mp3Src == null && cachedTrackIds.get().has(track.id!)) {
      const blob: Blob | undefined = await getCachedMp3(track.id!);
      mp3Src = window.URL.createObjectURL(blob!);
    }

    if (mp3Src == null) {
      mp3Src = appSettings.get().cloudfrontUrl!.replace('*', track.id!);
    }

    nextAe = nextAudioElement.get();

    if (nextAe != null && nextAe.src === mp3Src) {
      ae = nextAe;
    } else {
      ae.src = mp3Src;
    }

    ae.volume = import.meta.env.VITE_ENV === 'dev' ? 1 : 1;

    ae.addEventListener('play', (): void => {
      navigator.mediaSession.playbackState = 'playing';
      paused.set(false);
    });

    ae.addEventListener('pause', (): void => {
      navigator.mediaSession.playbackState = 'paused';
      paused.set(true);
    });

    ae.addEventListener('ended', async (): Promise<void> => {
      navigator.mediaSession.playbackState = 'none';
      await trackEnded();
    });

    ae.addEventListener('timeupdate', (): void => {
      currentTime.set(ae!.currentTime);
    });

    if (track.startAt == null) {
      ae.currentTime = 0;
    } else {
      ae.currentTime = track.startAt / 1000;
    }

    if (resumePausedAt != null) {
      ae.currentTime = resumePausedAt;

      try {
        ae.volume = 0;
        await ae.play();
        ae.pause();
      } catch (e: unknown) {
        // pause event cannot trigger unless a play has already happened
        navigator.mediaSession.playbackState = 'paused';
        paused.set(true);
      } finally {
        ae.volume = import.meta.env.VITE_ENV === 'dev' ? 1 : 1;
      }
    } else {
      await ae.play();
    }

    batch((): void => {
      audioElement.set(ae);
      duration.set(track.duration! / 1000);
      markCheckFn.set(window.setInterval(() => void checkTrackDone(), 500));
      nextAudioElement.set(null);
      localStorage.setItem('playing-track-id', track.id!);
    });

    notifyTrackPlay(track);
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(
        `Error starting play (attempt ${attemptNo}): ${e.message}`,
        'error'
      );
    } else {
      console.error(e);
    }

    if (ae != null) ae.src = '';

    if (attemptNo < 8) {
      setTimeout(() => void aePlay(attemptNo + 1), 1000 * attemptNo);
    }
  }
}

function notifyTrackPlay(track: Track): void {
  let notifBody: string = track.artist!;

  if (track.album) {
    notifBody = [notifBody, track.album].join(': ');
  }

  try {
    new Notification(track.title!, {
      body: notifBody,
      icon: 'images/icon1024.png',
    });
  } catch (e: unknown) {
    console.log(e);
  }
}

export async function playOrPause(): Promise<void> {
  if (playingTrack.get() == null) {
    // start playing at top of current playlist
    if (trackResults.get()?.count! > 0) await startPlayingInPlaylist();
  } else {
    // already playing something, so pause/resume
    const ae: HTMLAudioElement = audioElement.get()!;

    if (paused.get()) {
      await ae.play();
    } else {
      ae.pause();
    }
  }
}

export function scrubTo(seconds: number): void {
  audioElement.get()!.currentTime = seconds;
}

export function scrubRelative(seconds: number): void {
  (document.activeElement as HTMLElement).blur();

  const ae: HTMLAudioElement = audioElement.get()!;
  ae.currentTime += seconds;
}

export async function trackEnded(): Promise<void> {
  window.clearInterval(markCheckFn.get()!);
  markCheckFn.set(null);

  if (canPlayNext.get()) {
    await nextTrack();
  } else {
    stopPlayback();
  }
}

export function stopPlayback(fromSwipe = false): void {
  const ae: HTMLAudioElement | null = audioElement.get();
  if (ae != null) stopAudio(ae);

  const nextAe: HTMLAudioElement | null = nextAudioElement.get();
  if (nextAe != null) nextAe.src = '';

  audioElement.set(null);
  nextAudioElement.set(null);
  resetPlayedChecker();

  const playerEl: HTMLElement = document.getElementById('player')!;
  if (!fromSwipe) playerEl.classList.add('swiping-down');
  playerEl.classList.add('swiping-away');

  setTimeout((): void => {
    batch((): void => {
      playingPlaylistId.set(null);
      playQueue.set([]);
      playingTrack.set(null);
    });

    playerEl.classList.remove(
      ...['swiping-away', 'swiping-down', 'swiping-left', 'swiping-right']
    );

    localStorage.removeItem('elapsed');
    localStorage.removeItem('playing-track-id');
    localStorage.removeItem('playing-playlist-id');
  }, 200);
}

function resetPlayedChecker(): void {
  const checkFn: number = markCheckFn.get()!;

  window.clearInterval(checkFn);
  markedPlayed.set(false);
  markCheckFn.set(null);
  loadingNextAudioElement.set(false);
}

async function checkTrackDone(): Promise<void> {
  const pTrack: Track | null = playingTrack.get();
  const elapsed: number = currentTime.get()! * 1000;

  // return if not currently playing
  if (pTrack == null || paused.get()) return;

  const stopAt: number = pTrack.stopAt ?? duration.get()! * 1000;

  if (
    elapsed / stopAt >= 0.5 &&
    nextAudioElement.get() == null &&
    canPlayNext.get() &&
    !loadingNextAudioElement.get()
  ) {
    loadingNextAudioElement.set(true);
    preloadNextTrack(1);
  }

  // mark this track as played if not already done
  if (elapsed / stopAt >= 0.8 && !markedPlayed.get()) {
    await markTrackAsPlayed(pTrack);
  }

  if (elapsed >= stopAt) {
    await trackEnded();
  } else {
    localStorage.setItem('elapsed', String(elapsed / 1000));
  }
}

function preloadNextTrack(attemptNo: number): void {
  if (!canPlayNext.get()) return;

  try {
    const nextTrack: Track = playQueue.get()[queuePosition.get()![0] + 1];
    const ae: HTMLAudioElement = new Audio();

    if (cachedTrackIds.get().has(nextTrack.id!)) {
      return;
    } else {
      ae.src = appSettings.get().cloudfrontUrl!.replace('*', nextTrack.id!);
    }

    nextAudioElement.set(ae);
    loadingNextAudioElement.set(false);
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(
        `Error preloading track (attempt ${attemptNo}): ${e.message}`,
        'error'
      );
    } else {
      console.error(e);
    }

    if (attemptNo < 5) {
      setTimeout(preloadNextTrack, 1000 * attemptNo, attemptNo + 1);
    }
  }
}

function updateTrackInPlayQueue(track: Track): void {
  playQueue.update((thePlayQueue: Track[]): Track[] => {
    for (let i = 1; i < thePlayQueue.length; i++) {
      if (thePlayQueue[i].id === track.id) {
        thePlayQueue[i] = track;
        break;
      }
    }

    return thePlayQueue;
  });
}

async function markTrackAsPlayed(track: Track): Promise<void> {
  markedPlayed.set(true);

  if (['Unaccompanied', 'Learn'].includes(playingPlaylist.get()!.name)) return;

  if (track.nPlays == null) {
    track.nPlays = 1;
  } else {
    track.nPlays++;
  }

  track.lastPlayed = DateTime.utc();

  try {
    const play: Play = new Play({ trackId: track.id! });
    play.dt = track.lastPlayed.toMillis();
    await insertPlay(play);
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(`Error marking track as played: ${e.message}`, 'error');
    } else {
      console.log(e);
    }
  }

  playingTrack.set(track);
  void scrobbleTrack(track);

  const tracks: Track[] = trackResults.get()!.results;

  const tix: number = tracks.findIndex((t: Track): boolean => {
    return t.id === track.id;
  });

  if (tix !== -1) {
    // updated track is in active playlist
    tracks[tix] = track;

    trackResults.update(
      (
        theTrackResult: TabResults<Track> | undefined
      ): TabResults<Track> | undefined => {
        if (theTrackResult != null) theTrackResult.results = tracks;
        return theTrackResult;
      }
    );
  }

  updateTrackInPlayQueue(track);
}

async function scrobbleTrack(track: Track): Promise<void> {
  if (
    !appSettings.get().doScrobble ||
    track.artist == null ||
    track.title == null ||
    track.duration == null ||
    !DB.online
  ) {
    return;
  }

  const payload: ScrobblePayload = {
    album_artist: track.albumArtist ?? undefined,
    artist: track.artist,
    album: track.album ?? undefined,
    track_number: track.trackI ?? undefined,
    title: track.title,
    duration: track.duration,
  };

  const url: string = [appSettings.get().apiUrl, 'tracks', 'scrobble'].join(
    '/'
  );

  try {
    const res: Response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': appSettings.get().apiKey!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw Error(res.statusText);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(`Error scrobbling "${track.title}"`, 'error');
    } else {
      console.log(e);
    }
  }
}

export async function rateSingleTrack(
  track: Track,
  rating: number
): Promise<void> {
  track.updatedAt = DateTime.now().toMillis();
  track.rating = rating > 0 ? rating : undefined;

  await updateTracks(
    [
      {
        id: track.id!,
        updatedAt: track.updatedAt,
        rating: track.rating,
      },
    ],
    true
  );

  if (playingTrack.get()?.id === track.id) {
    playingTrack.set(track);
  }

  const tracks: Track[] = trackResults.get()!.results;

  const tix: number = tracks.findIndex((t: Track): boolean => {
    return t.id === track.id;
  });

  if (tix !== -1) {
    // updated track is in active playlist
    tracks[tix] = track;

    trackResults.update(
      (
        theTrackResult: TabResults<Track> | undefined
      ): TabResults<Track> | undefined => {
        if (theTrackResult != null) theTrackResult.results = tracks;
        return theTrackResult;
      }
    );
  }

  updateTrackInPlayQueue(track);

  const stars: string = rating === 0 ? '∅' : '★'.repeat(rating);
  logMessage(`Rated "${track.title!}" ${stars}`, 'success');
}

playQueue.subscribe(($playQueue: Track[]): void => {
  setQueuePosition($playQueue, playingTrack.get());
});

playingTrack.subscribe(($playingTrack: Track | null): void => {
  setQueuePosition(playQueue.get(), $playingTrack);
});

playingPlaylistId.subscribe(($playingPlaylistId: number | null): void => {
  playingPlaylist.set(
    playlists.get().find((p: Playlist): boolean => {
      return p.id === $playingPlaylistId;
    }) ?? null
  );
});

async function getQueueTracks(pPlaylist: Playlist): Promise<Track[]> {
  const ts = new TrackSettings();

  ts.sortBy = {
    col: 'ix',
    asc: true,
  };
  ts.staticAggs = '';

  const queryParams = new Map<string, TabSettingsQueryParam>();
  queryParams.set('_playlistId', {
    gqlType: 'Int',
    value: pPlaylist.id,
  });
  ts.queryParams = queryParams;

  return (await ts.getResults<Track>(1000, 0)).results;
}

export async function updateQueueFromPlaylist(
  playlistModified: Playlist
): Promise<void> {
  const pPlaylist: Playlist | null = playingPlaylist.get();
  if (pPlaylist == null || pPlaylist.id !== playlistModified.id) return;

  let tracks = await getQueueTracks(pPlaylist);

  playQueue.set([...tracks]);

  const pTrack: Track | null = playingTrack.get();

  if (pTrack == null) return;

  const pTrackIndex: number = tracks.findIndex((t: Track): boolean => {
    return t.id === pTrack.id;
  });

  if (pTrackIndex === -1) {
    stopPlayback();
  } else {
    // metadata might have changed due to editing
    playingTrack.set(tracks[pTrackIndex]);
  }
}
