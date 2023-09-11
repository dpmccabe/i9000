import {
  allPlaylistName,
  appendTracksToPlaylist,
  cutOrCopy,
  cutOrCopyFromPlaylistId,
  insertTracksInPlaylist,
  logMessage,
  multiSelecting,
  type Playlist,
  removeTracksFromPlaylist,
  selectedTrackIds,
  selectedTrackIdsInOrder,
  tracksClipboard,
  currentPlaylist,
} from '../../internal';

export function cutTracks(): void {
  const tids: string[] = selectedTrackIdsInOrder.get();
  if (tids.length === 0) return;

  const cutPlaylist: Playlist = currentPlaylist.get()!;
  if (cutPlaylist.name === allPlaylistName) return;

  cutOrCopy.set('cut');
  cutOrCopyFromPlaylistId.set(cutPlaylist.id);
  tracksClipboard.set(tids);
  logMessage(`Cutting ${tids.length} tracks`, 'info');
}

export function copyTracks(): void {
  const tids: string[] = selectedTrackIdsInOrder.get();
  if (tids.length === 0) return;

  cutOrCopy.set('copy');
  cutOrCopyFromPlaylistId.set(currentPlaylist.get()?.id ?? null);
  tracksClipboard.set(tids);
  logMessage(`Copying ${tids.length} tracks`, 'info');
}

export async function pasteTracks(
  playlist: Playlist | null = null,
  rix: number | null = null
): Promise<void> {
  const tids: string[] = tracksClipboard.get();
  if (tids.length === 0) return;

  const pastePlaylist: Playlist = playlist ?? currentPlaylist.get()!;
  if (pastePlaylist.name === allPlaylistName) return;

  if (cutOrCopy.get() === 'cut') {
    if (cutOrCopyFromPlaylistId.get()! !== pastePlaylist.id) {
      await removeTracksFromPlaylist(
        cutOrCopyFromPlaylistId.get()!,
        new Set(tids)
      );
    } else if (rix == null) {
      // cut-pasting into same playlist, but essentially moving to end
      rix = Infinity;
    }
  }

  if (rix == null) {
    await appendTracksToPlaylist(pastePlaylist, tids);
  } else {
    await insertTracksInPlaylist(pastePlaylist, tids, rix);
  }

  logMessage(
    `Pasted ${tids.length} tracks into ${pastePlaylist.name}`,
    'success'
  );
}

export function clearTracksClipboard(): void {
  multiSelecting.set(false);
  selectedTrackIds.set(new Set());
  cutOrCopy.set(null);
  cutOrCopyFromPlaylistId.set(null);
  tracksClipboard.set([]);
}

export function removeDragClass(): void {
  const trs: HTMLCollectionOf<Element> =
    document.getElementsByClassName('cursor-below');

  while (trs.length) {
    trs[0].classList.remove('cursor-below');
  }
}
