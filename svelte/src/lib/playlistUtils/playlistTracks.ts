import { DateTime } from 'luxon';
import {
  allPlaylist,
  allPlaylistName,
  currentPlaylist,
  currentPlaylistTracksHistoryId,
  deletePlaylistTracks,
  getPlaylistTrackIds,
  insertPlaylistTracks,
  pivotRow,
  playingPlaylist,
  playingTrack,
  type Playlist,
  playlists,
  type PlaylistTrack,
  playlistTracksHistoryIds,
  restoreFromPlaylistTracksHistory,
  selectedTrackIds,
  selectingRow,
  setCurrentPlaylist,
  shufflePlaylist,
  type Track,
  trackResults,
  tracksAreReorderable,
  trackSettings,
  updateQueueFromPlaylist,
} from '../../internal';

export async function insertTracksInPlaylist(
  playlist: Playlist,
  trackIds: string[],
  belowRix: number
): Promise<void> {
  if (!tracksAreReorderable.get()) return;

  const unselTrackIds: string[] = [];
  let insertBelowIndex = -1;
  const tracks: Track[] = trackResults.get()!.results;
  if (belowRix === Infinity) belowRix = tracks.length - 1;

  for (let i = 0; i < tracks.length; i++) {
    if (!trackIds.includes(tracks[i].id!)) unselTrackIds.push(tracks[i].id!);
    if (belowRix === i) insertBelowIndex = unselTrackIds.length - 1;
  }

  const reorderedTrackIds: string[] = unselTrackIds
    .slice(0, insertBelowIndex + 1)
    .concat(trackIds)
    .concat(unselTrackIds.slice(insertBelowIndex + 1));

  await updatePlaylistTracks(playlist, reorderedTrackIds, true);
}

export async function trackMoveUpDown(dir: 'up' | 'down'): Promise<void> {
  if (!tracksAreReorderable.get()) return;

  const selIds: Set<string> = selectedTrackIds.get();
  const nTracks: number = trackResults.get()!.count;

  if (selIds.size === 0 || selIds.size === nTracks) return;

  const selTrackIdsInOrder: string[] = [];
  const unselTrackIds: string[] = [];
  let doneWithSelected = false;
  let insertIndex: number | null = null;
  const tracks: Track[] = trackResults.get()!.results;
  let track: Track;

  for (let i = 0; i < tracks.length; i++) {
    track = tracks[i];

    if (selIds.has(track.id!)) {
      if (doneWithSelected) {
        // not a contiguous selection
        return;
      }

      if (i === nTracks - 1 && dir === 'down') {
        // already at bottom
        return;
      }

      if (insertIndex == null && dir === 'up') {
        // this is the first selected track
        if (i === 0) {
          // already at top
          return;
        }

        insertIndex = unselTrackIds.length - 1;
      }

      selTrackIdsInOrder.push(track.id!);
    } else {
      if (selTrackIdsInOrder.length > 0) {
        doneWithSelected = true;
      }

      unselTrackIds.push(track.id!);

      if (doneWithSelected && insertIndex == null && dir === 'down') {
        // previous track was final selected one
        insertIndex = unselTrackIds.length;
      }
    }
  }

  const reorderedTrackIds: string[] = unselTrackIds
    .slice(0, insertIndex!)
    .concat(selTrackIdsInOrder)
    .concat(unselTrackIds.slice(insertIndex!));

  pivotRow.set(insertIndex);
  selectingRow.set(insertIndex);

  await updatePlaylistTracks(currentPlaylist.get()!, reorderedTrackIds, true);
}

export async function clearRecentlyPlayedTracks(
  playlist: Playlist | null = null
): Promise<void> {
  const thePlaylist: Playlist = playlist ?? playingPlaylist.get()!;

  if (
    [allPlaylistName, 'Unaccompanied', 'Learn', 'Import'].includes(
      thePlaylist?.name
    )
  ) {
    return;
  }

  const tracks: Track[] = trackResults.get()!.results;
  const pTrack: Track | null = playingTrack.get();

  // remove if played recently or is before playing track in playlist
  const playedTids: string[] = tracks.reduce(
    (acc: string[], t: Track): string[] => {
      if (
        (t.lastPlayed != null &&
          -(t.lastPlayed as DateTime).diffNow().as('hours') < 12 &&
          !(pTrack != null && pTrack.ix === t.ix)) ||
        (pTrack != null && t.ix! < pTrack.ix!)
      ) {
        acc.push(t.id!);
      }

      return acc;
    },
    []
  );

  if (playedTids.length > 0) {
    await removeTracksFromPlaylist(thePlaylist.id, new Set(playedTids));
  }
}

export async function updatePlaylistTracks(
  playlist: Playlist,
  trackIds: string[],
  pushHistory = false
): Promise<void> {
  const playlistTracks: PlaylistTrack[] = trackIds.map(
    (
      tid: string,
      i: number
    ): { playlistId: number; trackId: string; ix: number } => {
      return { playlistId: playlist.id, trackId: tid, ix: i };
    }
  );

  const historyIds: number[] | undefined = await insertPlaylistTracks(
    playlistTracks,
    currentPlaylistTracksHistoryId.get(),
    pushHistory,
    true
  );

  if (playlist.id === currentPlaylist.get()?.id) {
    trackSettings.touch();
  }

  if (historyIds != null) {
    playlistTracksHistoryIds.set(historyIds);
    currentPlaylistTracksHistoryId.set(null);
  }

  await updateQueueFromPlaylist(playlist);
}

export async function updatePlaylistTracksShuffle(
  playlist: Playlist,
  pushHistory = false
): Promise<void> {
  if (playlist.name === allPlaylistName) return;

  const historyIds: number[] | undefined = await shufflePlaylist(
    playlist.id,
    currentPlaylistTracksHistoryId.get(),
    pushHistory
  );

  if (historyIds != null) {
    playlistTracksHistoryIds.set(historyIds);
    currentPlaylistTracksHistoryId.set(null);
  }

  trackSettings.touch();

  await updateQueueFromPlaylist(playlist);
}

export async function appendTracksToPlaylist(
  playlist: Playlist,
  trackIds: string[],
  pushHistory = true
): Promise<void> {
  const playlistTracks: PlaylistTrack[] = [];
  const existingTrackIds: Set<string> = await getPlaylistTrackIds(playlist.id);

  trackIds.forEach((tid: string, i: number): void => {
    if (!existingTrackIds.has(tid)) {
      playlistTracks.push({
        playlistId: playlist.id,
        trackId: tid,
        ix: i + 100000,
      });
    }
  });

  if (playlistTracks.length > 0) {
    const historyIds: number[] | undefined = await insertPlaylistTracks(
      playlistTracks,
      currentPlaylistTracksHistoryId.get(),
      pushHistory,
      false
    );

    if (playlist.id === currentPlaylist.get()?.id) {
      trackSettings.touch();
    }

    if (historyIds != null) {
      playlistTracksHistoryIds.set(historyIds);
      currentPlaylistTracksHistoryId.set(null);
    }

    await updateQueueFromPlaylist(playlist);
  }
}

export async function removeTracksFromPlaylist(
  playlistId: number,
  trackIds: Set<string>
): Promise<void> {
  if (playlistId === allPlaylist.get()!.id) return;

  const historyIds: number[] = await deletePlaylistTracks(
    playlistId,
    trackIds,
    true,
    currentPlaylistTracksHistoryId.get()
  );

  if (playlistId === currentPlaylist.get()!.id) {
    trackSettings.touch();
  }

  if (historyIds != null) {
    playlistTracksHistoryIds.set(historyIds);
    currentPlaylistTracksHistoryId.set(null);
  }

  await updateQueueFromPlaylist(
    playlists.get().find((p: Playlist): boolean => p.id === playlistId)!
  );
}

export async function undoPlaylistTracksUpdate(): Promise<void> {
  const histVersions: number[] = playlistTracksHistoryIds.get();
  const curHistId: number | null = currentPlaylistTracksHistoryId.get();
  if (histVersions.length === 0 || curHistId === histVersions[0]) return;

  let histIdToApply: number;

  if (curHistId == null) {
    histIdToApply = histVersions[histVersions.length - 1];
  } else {
    histIdToApply = histVersions[histVersions.indexOf(curHistId) - 1];
  }

  const modPlaylistId: number = await restoreFromPlaylistTracksHistory(
    histIdToApply
  );

  currentPlaylistTracksHistoryId.set(histIdToApply);

  if (modPlaylistId === currentPlaylist.get()!.id) {
    trackSettings.touch();
  } else {
    await setCurrentPlaylist(modPlaylistId);
  }

  await updateQueueFromPlaylist(
    playlists.get().find((p: Playlist): boolean => p.id === modPlaylistId)!
  );
}
