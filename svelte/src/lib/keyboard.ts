import {
  activePane,
  allPlaylistName,
  authed,
  clearRecentlyPlayedTracks,
  clearTracksClipboard,
  copyTracks,
  currentPlaylist,
  cutOrCopy,
  cutTracks,
  deleteSelectedTracks,
  deselectAllTracks,
  expandSelectionToBottom,
  expandSelectionToTop,
  keyboard,
  nTracksSelected,
  pasteTracks,
  playingTrack,
  playlistQuickSelectMatches,
  playlistQuickSelectPos,
  playlistQuickSelectText,
  playOrPause,
  playSelectedTrack,
  prepEditTags,
  prepParseTitles,
  prepSearchReplace,
  prepThisThat,
  prompt,
  quickSelectPlaylist,
  rateSingleTrack,
  removeSelectedTracks,
  resetCommandBar,
  scrubRelative,
  selectAlbumTracks,
  selectAllTracks,
  selectedTrackIds,
  selectFirst,
  selectLast,
  selectNextTrack,
  selectPlayingTrack,
  selectPreviousTrack,
  startPlayingInPlaylist,
  stopPlayback,
  toggleSelectionDown,
  toggleSelectionUp,
  type Track,
  trackMoveUpDown,
  unactionAll,
  undoPlaylistTracksUpdate,
  viewAlbums,
  viewReleases,
} from '../internal';

export function keyUp(ev: KeyboardEvent): void {
  // some keyboard events don't generate presses, so handle them with up
  keyboard.set({ shiftPressed: ev.shiftKey, cmdPressed: ev.metaKey });
}

export async function keyDown(ev: KeyboardEvent): Promise<void> {
  keyboard.set({ shiftPressed: ev.shiftKey, cmdPressed: ev.metaKey });

  if (!authed.get()) return;

  // allow default handlers for bypass-cache refresh
  if (ev.key === 'r' && ev.metaKey && ev.shiftKey) return;

  if (ev.key === 'w' && ev.metaKey) {
    ev.preventDefault();
    return;
  }

  const promptMasks: HTMLCollectionOf<Element> =
    document.getElementsByClassName('prompt-mask');

  // page up/down
  if (
    activePane.get() === 'main' &&
    (ev.key === 'PageDown' || ev.key === 'PageUp')
  ) {
    document.getElementById('view')!.focus();

    // no preventDefault
    return;
  }

  // tracks selection
  if (activePane.get() === 'main' || activePane.get() === 'tracks') {
    if (
      ev.key === 'Backspace' &&
      ev.metaKey &&
      nTracksSelected.get() > 0 &&
      document.activeElement?.tagName !== 'SELECT' &&
      document.activeElement?.tagName !== 'INPUT'
    ) {
      activePane.set('tracks');

      prompt.set({
        shown: true,
        title: `Delete ${nTracksSelected.get()} tracks?`,
        hasTextInput: false,
        okAction: (): void => {
          void deleteSelectedTracks();
        },
      });

      return;
    } else if (await handleTrackSelection(ev)) {
      return;
    }
  }

  if (handleEscape(ev, promptMasks)) return;
  if (await handlePlaylistSelection(ev)) return;
  if (await handlePlayback(ev)) return;
  if (await handlePaneSelection(ev)) return;
  if (await handleFormSubmission(ev, promptMasks)) return;
}

export function handleEscape(
  ev: KeyboardEvent,
  promptMasks: HTMLCollectionOf<Element>
): boolean {
  if (ev.key !== 'Escape') return false;

  (document.activeElement as HTMLElement).blur();
  playlistQuickSelectText.set('');
  playlistQuickSelectPos.set(0);

  if (promptMasks.length === 1) {
    promptMasks[0].dispatchEvent(new Event('mousedown'));
  } else if (activePane.get() === 'col-selector') {
    activePane.set('main');
  } else if (activePane.get() === 'command-bar') {
    resetCommandBar();
    (document.activeElement as HTMLElement).blur();
    activePane.set('main');
  } else if (activePane.get() === 'help') {
    activePane.set('main');
  } else if (activePane.get() === 'import-queue') {
    activePane.set('main');
  } else if (activePane.get() === 'tab-filters') {
    activePane.set('main');
  } else if (activePane.get() === 'playlists-editor') {
    activePane.set('main');
  } else if (activePane.get() === 'playlist-selector') {
    activePane.set('main');
  } else if (activePane.get() === 'playlists') {
    activePane.set('main');
    (document.activeElement as HTMLElement).blur();
  } else if (activePane.get() === 'tag-editor') {
    activePane.set('tracks');
    document.getElementById('tracks')?.focus();
  } else if (activePane.get() === 'parser') {
    activePane.set('tracks');
    document.getElementById('tracks')?.focus();
  } else if (activePane.get() === 'search-replace') {
    activePane.set('tracks');
    document.getElementById('tracks')?.focus();
  } else if (activePane.get() === 'this-that') {
    activePane.set('tracks');
    document.getElementById('tracks')?.focus();
  } else if (activePane.get() === 'play-queue') {
    activePane.set('main');
  } else if (activePane.get() === 'tracks' || activePane.get() === 'main') {
    unactionAll();
    deselectAllTracks();
    clearTracksClipboard();
    activePane.set('main');
  } else {
    return false;
  }

  ev.preventDefault();
  return true;
}

export async function handleTrackSelection(
  ev: KeyboardEvent
): Promise<boolean> {
  if (ev.key === 'l' && ev.metaKey) {
    ev.preventDefault();
    void selectPlayingTrack();
  } else if (
    document.activeElement?.tagName === 'SELECT' ||
    document.activeElement?.tagName === 'INPUT'
  ) {
    return false;
  } else if (ev.key === 'a' && ev.metaKey) {
    activePane.set('tracks');
    selectAllTracks();
  } else if (ev.key === 'ArrowUp') {
    activePane.set('tracks');

    if (ev.shiftKey) {
      if (ev.metaKey) {
        expandSelectionToTop();
      } else {
        toggleSelectionUp();
      }
    } else {
      if (ev.metaKey && ev.ctrlKey) {
        await trackMoveUpDown('up');
      } else if (ev.metaKey) {
        selectFirst();
      } else {
        selectPreviousTrack();
      }
    }
  } else if (ev.key === 'ArrowDown') {
    activePane.set('tracks');

    if (ev.shiftKey) {
      if (ev.metaKey) {
        expandSelectionToBottom();
      } else {
        toggleSelectionDown();
      }
    } else {
      if (ev.metaKey && ev.ctrlKey) {
        await trackMoveUpDown('down');
      } else if (ev.metaKey) {
        selectLast();
      } else {
        selectNextTrack();
      }
    }
  } else if (ev.key === 'i' && ev.metaKey) {
    prepEditTags();
  } else if (ev.key === 'e' && ev.metaKey) {
    selectAlbumTracks();
  } else if (ev.key === 'p' && ev.metaKey) {
    prepParseTitles();
  } else if (ev.key === 'r' && ev.metaKey && !ev.shiftKey) {
    prepSearchReplace();
  } else if (ev.key === 'g' && ev.metaKey) {
    prepThisThat();
  } else if (ev.ctrlKey && ev.key === 'Backspace') {
    await clearRecentlyPlayedTracks();
  } else if (ev.key === 'Backspace' && !ev.metaKey && cutOrCopy.get() == null) {
    await removeSelectedTracks();
  } else if (
    ev.metaKey &&
    ['0', '1', '2', '3'].includes(ev.key) &&
    !['releases'].includes(activePane.get())
  ) {
    await ratePlaying(parseInt(ev.key));
  } else if (ev.metaKey && ev.key === 'c') {
    copyTracks();
  } else if (ev.metaKey && ev.key === 'x') {
    cutTracks();
  } else if (ev.metaKey && ev.key === 'v') {
    await pasteTracks();
  } else if (ev.metaKey && ev.key === 'z') {
    await undoPlaylistTracksUpdate();
  } else {
    return false;
  }

  ev.preventDefault();
  return true;
}

export async function handlePlaylistSelection(
  ev: KeyboardEvent
): Promise<boolean> {
  if (activePane.get() !== 'playlists') return false;

  if (ev.key === 'Backspace') {
    playlistQuickSelectText.set(playlistQuickSelectText.get().slice(0, -1));
  } else if (ev.key === 'ArrowUp') {
    if (playlistQuickSelectPos.get() > 0) {
      playlistQuickSelectPos.set(playlistQuickSelectPos.get() - 1);
    }
  } else if (ev.key === 'ArrowDown') {
    if (
      playlistQuickSelectPos.get() <
      playlistQuickSelectMatches.get().length - 1
    ) {
      playlistQuickSelectPos.set(playlistQuickSelectPos.get() + 1);
    }
  } else if (ev.key === 'Enter') {
    await quickSelectPlaylist();
  } else if ((ev.key >= 'a' && ev.key <= 'z') || ev.key === ' ') {
    playlistQuickSelectPos.set(0);
    playlistQuickSelectText.set(playlistQuickSelectText.get() + ev.key);
  } else {
    return false;
  }

  ev.preventDefault();
  return true;
}

export async function handlePlayback(ev: KeyboardEvent): Promise<boolean> {
  if (ev.metaKey && ev.key === 's') {
    ev.preventDefault();
    stopPlayback();
  } else if (
    ev.altKey &&
    ev.key === 'ArrowLeft' &&
    document.activeElement?.tagName !== 'INPUT'
  ) {
    scrubRelative(-3);
  } else if (
    ev.altKey &&
    ev.key === 'ArrowRight' &&
    document.activeElement?.tagName !== 'INPUT'
  ) {
    scrubRelative(3);
  } else if (
    ev.key === ' ' &&
    document.activeElement?.tagName !== 'INPUT' &&
    activePane.get() !== 'playlists'
  ) {
    ev.preventDefault();

    if (playingTrack.get() == null) {
      if (selectedTrackIds.get().size > 0) {
        await playSelectedTrack();
      } else {
        await startPlayingInPlaylist();
      }
    } else {
      await playOrPause();
    }
  } else {
    return false;
  }

  ev.preventDefault();
  return true;
}

export async function handlePaneSelection(ev: KeyboardEvent): Promise<boolean> {
  if (
    (activePane.get() === 'main' ||
      activePane.get() === 'tracks' ||
      activePane.get() === 'playlists') &&
    document.activeElement?.tagName !== 'SELECT' &&
    document.activeElement?.tagName !== 'INPUT'
  ) {
    if (ev.key === 'a') {
      await viewAlbums();
    } else if (ev.key === 'r' && !ev.metaKey) {
      await viewReleases();
    } else if (ev.key === 'i') {
      ev.preventDefault();
      activePane.set('import-queue');
    } else if (ev.key === 'p') {
      activePane.set('playlists');
    } else if (ev.key === 'q' && !ev.metaKey) {
      activePane.set('play-queue');
    } else if (ev.key === 'w' && !ev.metaKey) {
      document.getElementById('tracks')?.classList.toggle('full-width');
      document.getElementById('albums')?.classList.toggle('full-width');
      document.getElementById('releases')?.classList.toggle('full-width');
      document.getElementById('aside-main')?.classList.toggle('full-width');
    } else if (ev.key === '/') {
      ev.preventDefault();
      activePane.set('command-bar');
    } else if (ev.key === '?') {
      activePane.set('help');
    } else {
      return false;
    }
  } else {
    return false;
  }

  ev.preventDefault();
  return true;
}

export async function handleFormSubmission(
  ev: KeyboardEvent,
  promptMasks: HTMLCollectionOf<Element>
): Promise<boolean> {
  if (ev.key === 'Enter') {
    if (promptMasks.length === 1) {
      const promptForms: HTMLCollectionOf<HTMLFormElement> =
        promptMasks[0].getElementsByTagName('form');

      if (
        promptForms.length === 1 &&
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        promptForms[0].dispatchEvent(new Event('submit'));
      }
    } else if (cutOrCopy.get() != null) {
      const target: HTMLCollectionOf<Element> =
        document.getElementsByClassName('cursor-below');

      if (target.length === 1) {
        const rix: number = parseInt(target[0].getAttribute('data-rix')!);
        await pasteTracks(null, rix);
      }

      ev.preventDefault();
    } else {
      return false;
    }
  } else {
    return false;
  }

  return true;
}

async function ratePlaying(rating: number): Promise<void> {
  const pTrack: Track | null = playingTrack.get();
  if (pTrack == null) return;
  await rateSingleTrack(pTrack, rating);
}
