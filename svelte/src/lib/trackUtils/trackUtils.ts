import {
  narrow,
  type TabResults,
  type Track,
  trackResults,
  trackSettings,
  type TrackSettings,
  tracksAreReorderable,
  playlists,
  type Playlist,
  putPlaylist,
} from '../../internal';

const trackBatchSizes = [150, 150];

trackSettings.subscribe(($trackSettings: TrackSettings | undefined): void => {
  void (async (): Promise<void> => {
    if ($trackSettings === undefined) {
      trackResults.set(undefined);
      return;
    }

    trackResults.set(
      await $trackSettings.getResults<Track>(
        narrow.get() ? trackBatchSizes[0] : trackBatchSizes[1],
        0
      )
    );

    const playlistId: number | null =
      $trackSettings.queryParams.get('_playlistId')?.value;

    tracksAreReorderable.set(
      playlistId != null &&
        $trackSettings.sortBy.col === 'ix' &&
        $trackSettings.sortBy.asc &&
        $trackSettings.filters.size === 0
    );

    if (playlistId != null) {
      // save sort settings back to playlist record
      const playlist: Playlist = playlists
        .get()
        .find((p: Playlist): boolean => p.id === playlistId)!;

      if (
        playlist.sortCol !== $trackSettings.sortBy.col ||
        playlist.sortAsc !== $trackSettings.sortBy.asc
      ) {
        playlist.sortCol = $trackSettings.sortBy.col;
        playlist.sortAsc = $trackSettings.sortBy.asc;
        await putPlaylist(playlist);
      }
    }

    const trackSettingsToStore: Record<string, any> = {
      playlistId: $trackSettings.queryParams.get('_playlistId')?.value,
    };

    localStorage.setItem(
      'track-settings',
      JSON.stringify(trackSettingsToStore)
    );
  })();
});

export async function getNextTrackResultsBatch(): Promise<void> {
  const theTrackResults: TabResults<Track> = trackResults.get()!;

  const nextBatch: TabResults<Track> = await trackSettings
    .get()!
    .getResults<Track>(
      narrow.get() ? trackBatchSizes[0] : trackBatchSizes[1],
      theTrackResults.results.length
    );

  theTrackResults.results = theTrackResults.results.concat(nextBatch.results);

  trackResults.set(theTrackResults);
}
