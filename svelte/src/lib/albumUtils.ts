import {
  narrow,
  type Album,
  albumResults,
  type AlbumSettings,
  albumSettings,
  type TabResults,
} from '../internal';

const albumBatchSizes = [20, 100];

albumSettings.subscribe(($albumSettings: AlbumSettings | undefined): void => {
  void (async (): Promise<void> => {
    if ($albumSettings === undefined) {
      albumResults.set(undefined);
      return;
    }

    const theAlbumResults: TabResults<Album> =
      await $albumSettings.getResults<Album>(
        narrow.get() ? albumBatchSizes[0] : albumBatchSizes[1],
        0
      );
    albumResults.set(theAlbumResults);
  })();
});

export async function getNextAlbumResultsBatch(): Promise<void> {
  const theAlbumResults: TabResults<Album> = albumResults.get()!;

  const nextBatch: TabResults<Album> = await albumSettings
    .get()!
    .getResults<Album>(
      narrow.get() ? albumBatchSizes[0] : albumBatchSizes[1],
      theAlbumResults.results.length
    );

  theAlbumResults.results = theAlbumResults.results.concat(nextBatch.results);

  albumResults.set(theAlbumResults);
}
