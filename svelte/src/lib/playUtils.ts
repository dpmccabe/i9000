import {
  narrow,
  type Play,
  playResults,
  type PlaySettings,
  playSettings,
  type TabResults,
} from '../internal';

const playBatchSizes = [20, 100];

playSettings.subscribe(($playSettings: PlaySettings | undefined): void => {
  void (async (): Promise<void> => {
    if ($playSettings === undefined) {
      playResults.set(undefined);
      return;
    }

    const thePlayResults: TabResults<Play> =
      await $playSettings.getResults<Play>(
        narrow.get() ? playBatchSizes[0] : playBatchSizes[1],
        0
      );
    playResults.set(thePlayResults);
  })();
});

export async function getNextPlayResultsBatch(): Promise<void> {
  const thePlayResults: TabResults<Play> = playResults.get()!;

  const nextBatch: TabResults<Play> = await playSettings
    .get()!
    .getResults<Play>(
      narrow.get() ? playBatchSizes[0] : playBatchSizes[1],
      thePlayResults.results.length
    );

  thePlayResults.results = thePlayResults.results.concat(nextBatch.results);

  playResults.set(thePlayResults);
}
