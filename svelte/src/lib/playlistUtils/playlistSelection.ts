import { tick } from 'svelte';
import {
  activePane,
  allPlaylist,
  getPlaylist,
  multiSelecting,
  pivotRow,
  type Playlist,
  playlistQuickSelectMatches,
  playlistQuickSelectPos,
  playlistQuickSelectText,
  playlists,
  selectedTrackIds,
  type TabSettingsQueryParam,
  trackSettings,
  TrackSettings,
  view,
} from '../../internal';

export async function setCurrentPlaylist(playlistId: number): Promise<void> {
  document.getElementById('view')!.scrollTop = 0;
  history.pushState('', '', '#');

  view.set('tracks');
  await tick();
  activePane.set('main');
  document.getElementById('tracks')?.focus();

  let fetchedPlaylist: Playlist;

  if (playlistId == null) {
    fetchedPlaylist = allPlaylist.get()!;
  } else {
    // in case sort was modified by another client
    fetchedPlaylist = await getPlaylist(playlistId);
  }

  pivotRow.set(null);
  selectedTrackIds.set(new Set());
  playlistQuickSelectText.set('');
  playlistQuickSelectPos.set(0);
  multiSelecting.set(false);

  trackSettings.update((ts: TrackSettings | undefined): TrackSettings => {
    ts = new TrackSettings();

    ts.sortBy = {
      col: fetchedPlaylist.sortCol,
      asc: fetchedPlaylist.sortAsc,
    };

    const queryParams = new Map<string, TabSettingsQueryParam>();
    queryParams.set('_playlistId', {
      gqlType: 'Int',
      value:
        fetchedPlaylist.id === allPlaylist.get()?.id
          ? null
          : fetchedPlaylist.id,
    });
    ts.queryParams = queryParams;

    return ts;
  });
}

export async function quickSelectPlaylist(): Promise<void> {
  const matches: Playlist[] = playlistQuickSelectMatches.get();
  if (matches.length === 0) return;

  await setCurrentPlaylist(matches[playlistQuickSelectPos.get()].id);
}

playlistQuickSelectText.subscribe(($playlistQuickSelectText: string): void => {
  if ($playlistQuickSelectText.length === 0) {
    playlistQuickSelectMatches.set([]);
    return;
  }

  playlistQuickSelectMatches.set(
    playlists.get().reduce((acc: Playlist[], p: Playlist): Playlist[] => {
      if (
        p.name
          .replaceAll(/[^a-z \d]+/gi, ' ')
          .replaceAll(/\s{2,}/gi, ' ')
          .toLowerCase()
          .startsWith($playlistQuickSelectText)
      ) {
        acc.push(p);
      }

      return acc;
    }, [])
  );
});
