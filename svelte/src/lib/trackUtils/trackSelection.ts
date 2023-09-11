import { tick } from 'svelte';
import {
  allPlaylistName,
  currentPlaylist,
  getNextTrackResultsBatch,
  keyboard,
  multiSelecting,
  nTracksSelected,
  pivotRow,
  playingPlaylistId,
  playingTrack,
  type Playlist,
  removeTracksFromPlaylist,
  selectedTrackIds,
  selectedTrackIdsInOrder,
  selectedTracks,
  selectingRow,
  setCurrentPlaylist,
  type Track,
  trackResults,
} from '../../internal';

export function selectTrack(track: Track, rix: number): void {
  let newSelectedTrackIds: Set<string> = selectedTrackIds.get();
  const theKeyboard: Record<string, boolean> = keyboard.get();
  const thePivotRow: number | null = pivotRow.get();
  const tracks: Track[] = trackResults.get()!.results;

  if (theKeyboard.shiftPressed && thePivotRow != null) {
    for (
      let j = Math.min(rix, thePivotRow);
      j <= Math.max(rix, thePivotRow);
      j++
    ) {
      newSelectedTrackIds.add(tracks[j].id!);
    }

    selectingRow.set(rix);
  } else if (theKeyboard.cmdPressed || multiSelecting.get()) {
    if (newSelectedTrackIds.has(track.id!)) {
      newSelectedTrackIds.delete(track.id!);
    } else {
      newSelectedTrackIds.add(track.id!);
    }

    pivotRow.set(rix);
    selectingRow.set(rix);
  } else {
    newSelectedTrackIds = new Set([track.id!]);
    pivotRow.set(rix);
    selectingRow.set(rix);
  }

  selectedTrackIds.set(newSelectedTrackIds);
}

export function selectPreviousTrack(): boolean {
  const tracks: Track[] = trackResults.get()!.results;
  const n: number = tracks.length;
  if (n === 0) return false;

  const selTids: Set<string> = selectedTrackIds.get();
  let newSelectedRix = 0;

  if (selTids.size === 0) {
    newSelectedRix = n - 1;
  } else if (selTids.size !== n) {
    for (let i = 1; i < tracks.length; i++) {
      if (selTids.has(tracks[i].id!)) {
        newSelectedRix = i - 1;
        break;
      }
    }
  }

  pivotRow.set(newSelectedRix);
  selectingRow.set(newSelectedRix);
  scrollTrackIntoViewIfNeeded(
    document.getElementById(`track-${newSelectedRix}`)!
  );
  selectedTrackIds.set(new Set([tracks[newSelectedRix].id!]));

  return true;
}

export function selectNextTrack(): boolean {
  const tracks: Track[] = trackResults.get()!.results;
  const n: number = tracks.length;
  if (n === 0) return false;

  const selTids: Set<string> = selectedTrackIds.get();
  let newSelectedRix: number = n - 1;

  if (selTids.size === 0) {
    newSelectedRix = 0;
  } else if (selTids.size !== n) {
    for (let i = 0; i < tracks.length - 1; i++) {
      if (selTids.has(tracks[i].id!)) {
        newSelectedRix = i + 1;
      }
    }
  }

  pivotRow.set(newSelectedRix);
  selectingRow.set(newSelectedRix);
  scrollTrackIntoViewIfNeeded(
    document.getElementById(`track-${newSelectedRix}`)!
  );
  selectedTrackIds.set(new Set([tracks[newSelectedRix].id!]));

  return true;
}

export function toggleSelectionUp(): void {
  if (trackResults.get()!.count === 0) return;

  const pivotI: number = pivotRow.get()!;
  const selI: number = selectingRow.get()!;

  if (selI === 0) {
    return;
  } else if (selI > pivotI) {
    selectedTrackIds.update((s: Set<string>): Set<string> => {
      s.delete(trackResults.get()!.results[selI].id!);
      return s;
    });
  } else {
    selectedTrackIds.update((s: Set<string>): Set<string> => {
      s.add(trackResults.get()!.results[selI - 1].id!);
      return s;
    });
  }

  scrollTrackIntoViewIfNeeded(document.getElementById(`track-${selI - 1}`)!);
  selectingRow.set(selI - 1);
}

export function toggleSelectionDown(): void {
  const n: number = trackResults.get()!.results.length;
  if (n === 0) return;

  const pivotI: number = pivotRow.get()!;
  const selI: number = selectingRow.get()!;

  if (selI === n - 1) {
    return;
  } else if (selI < pivotI) {
    selectedTrackIds.update((s: Set<string>): Set<string> => {
      s.delete(trackResults.get()!.results[selI].id!);
      return s;
    });
  } else {
    selectedTrackIds.update((s: Set<string>): Set<string> => {
      s.add(trackResults.get()!.results[selI + 1].id!);
      return s;
    });
  }

  scrollTrackIntoViewIfNeeded(document.getElementById(`track-${selI + 1}`)!);
  selectingRow.set(selI + 1);
}

export function expandSelectionToTop(): void {
  if (trackResults.get()!.count === 0) return;

  const pivotI: number = pivotRow.get()!;
  const selTids: Set<string> = selectedTrackIds.get();
  if (selTids.size === 0) return;
  const tracks: Track[] = trackResults.get()!.results;

  for (let i = 0; i < pivotI; i++) {
    selTids.add(tracks[i].id!);
  }

  selectedTrackIds.set(selTids);
  scrollTrackIntoViewIfNeeded(document.getElementById(`track-${0}`)!);
  selectingRow.set(0);
}

export function expandSelectionToBottom(): void {
  if (trackResults.get()!.count === 0) return;

  const pivotI: number = pivotRow.get()!;
  const selTids: Set<string> = selectedTrackIds.get();
  if (selTids.size === 0) return;
  const tracks: Track[] = trackResults.get()!.results;

  for (let i = pivotI; i < tracks.length; i++) {
    selTids.add(tracks[i].id!);
  }

  selectedTrackIds.set(selTids);
  scrollTrackIntoViewIfNeeded(
    document.getElementById(`track-${tracks.length - 1}`)!
  );
  selectingRow.set(tracks.length - 1);
}

export function selectFirst(): void {
  selectedTrackIds.set(new Set());
  selectNextTrack();
}

export function selectLast(): void {
  selectedTrackIds.set(new Set());
  selectPreviousTrack();
}

export function selectAllTracks(): void {
  selectedTrackIds.set(
    new Set(trackResults.get()!.results.map((t: Track): string => t.id!))
  );
  pivotRow.set(null);
  selectingRow.set(null);
}

export function deselectAllTracks(): void {
  selectedTrackIds.set(new Set());
  pivotRow.set(null);
  selectingRow.set(null);
}

export function selectAlbumTracks(): void {
  if (selectedTrackIds.get().size !== 1) return;

  const pvtRow: number | null = pivotRow.get();
  if (pvtRow == null) return;

  const tracks: Track[] = trackResults.get()!.results;

  const selectKey: string = [
    tracks[pvtRow].albumArtist ?? tracks[pvtRow].albumArtist ?? '',
    tracks[pvtRow].album ?? '',
  ].join('|');

  const newSelTids: string[] = [tracks[pvtRow].id!];
  let otKey: string;
  let i = 0;
  let checkingBefore = true;
  let checkingAfter = true;

  while (checkingBefore || checkingAfter) {
    i++;

    if (checkingBefore) {
      if (pvtRow - i < 0) {
        checkingBefore = false;
      } else {
        otKey = [
          tracks[pvtRow - i].albumArtist ??
            tracks[pvtRow - i].albumArtist ??
            '',
          tracks[pvtRow - i].album ?? '',
        ].join('|');

        if (otKey === selectKey) {
          newSelTids.push(tracks[pvtRow - i].id!);
        } else {
          checkingBefore = false;
        }
      }
    }

    if (checkingAfter) {
      if (pvtRow + i === tracks.length) {
        checkingAfter = false;
      } else {
        otKey = [
          tracks[pvtRow + i].albumArtist ??
            tracks[pvtRow + i].albumArtist ??
            '',
          tracks[pvtRow + i].album ?? '',
        ].join('|');

        if (otKey === selectKey) {
          newSelTids.push(tracks[pvtRow + i].id!);
        } else {
          checkingAfter = false;
        }
      }
    }
  }

  selectedTrackIds.set(new Set(newSelTids));
}

export async function removeSelectedTracks(): Promise<void> {
  const playlist: Playlist = currentPlaylist.get()!;
  if (playlist.name === allPlaylistName) return;

  const tracks: Track[] = trackResults.get()!.results;
  const selTids: Set<string> = selectedTrackIds.get();
  let lookingForFirstUnselectedAfterSelected = false;
  let lastUnselectedTrack: Track | null = null;
  let firstUnselectedTrack: Track | null = null;
  let firstUnselectedI = 0;

  await removeTracksFromPlaylist(playlist.id, selTids);

  if (selTids.size === tracks.length) {
    // all tracks were removed
    selectedTrackIds.set(new Set());
    pivotRow.set(null);
    selectingRow.set(null);
  } else {
    // can reselect a track
    for (const track of tracks) {
      if (selTids.has(track.id!)) {
        lookingForFirstUnselectedAfterSelected ||= true;
      } else {
        // this track is unselected
        lastUnselectedTrack = track;
        firstUnselectedI++;

        if (lookingForFirstUnselectedAfterSelected) {
          // done searching; this will be the new selected track
          firstUnselectedTrack = lastUnselectedTrack;
          break;
        }
      }
    }

    if (firstUnselectedTrack == null) {
      // the last track was one that was removed, so select new last track
      firstUnselectedTrack = lastUnselectedTrack!;
    }

    selectedTrackIds.set(new Set([firstUnselectedTrack.id!]));
    pivotRow.set(firstUnselectedI - 1);
    selectingRow.set(firstUnselectedI - 1);
  }
}

function scrollTrackIntoViewIfNeeded(el: HTMLElement): void {
  const tracksEl: HTMLElement = document.getElementById('tab-body')!;
  const view: HTMLElement = document.getElementById('view')!;

  if (el.offsetTop - tracksEl.offsetTop < view.scrollTop) {
    view.scrollTop = el.offsetTop - tracksEl.offsetTop;
  } else if (
    el.offsetTop + tracksEl.offsetTop >
    view.clientHeight + view.scrollTop
  ) {
    view.scrollTop =
      el.offsetTop +
      el.getBoundingClientRect().height +
      tracksEl.offsetTop -
      view.clientHeight;
  }
}

const checkReadyToSelectMs = 25;

async function doSelectPlayingTrack(nAttempts: number): Promise<void> {
  if (nAttempts === 50) return;

  const track: Track | null = playingTrack.get();
  if (track == null) return;

  if (playingPlaylistId.get() !== currentPlaylist.get()?.id) {
    window.setTimeout(
      doSelectPlayingTrack,
      checkReadyToSelectMs,
      nAttempts + 1
    );
    return;
  }

  const rowEl: HTMLElement | null = document.querySelector(
    `table#tracks tr[data-id="${track.id}"]`
  );

  if (rowEl == null) {
    window.setTimeout(
      doSelectPlayingTrack,
      checkReadyToSelectMs,
      nAttempts + 1
    );
    return;
  }

  selectedTrackIds.set(new Set([track.id!]));
  pivotRow.set(parseInt(rowEl!.dataset.rix!));
  scrollTrackIntoViewIfNeeded(rowEl);
}

export async function selectPlayingTrack(): Promise<void> {
  const ppid: number | null = playingPlaylistId.get();
  if (ppid == null) return;

  await setCurrentPlaylist(ppid);
  await tick();
  window.setTimeout(doSelectPlayingTrack, checkReadyToSelectMs, 1);
}

selectedTrackIds.subscribe(($selectedTrackIds: Set<string>): void => {
  const selTidsInOrder: string[] = [];
  const selTracks: Track[] = [];

  trackResults.get()?.results.forEach((track: Track): void => {
    if ($selectedTrackIds.has(track.id!)) {
      selTidsInOrder.push(track.id!);
      selTracks.push(track);
    }
  });

  selectedTrackIdsInOrder.set(selTidsInOrder);
  selectedTracks.set(selTracks);
  nTracksSelected.set(selTidsInOrder.length);
});
