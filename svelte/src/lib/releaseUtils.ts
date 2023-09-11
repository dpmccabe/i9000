import {
  narrow,
  type Release,
  releaseResults,
  type ReleaseSettings,
  releaseSettings,
  type TabResults,
} from '../internal';

const releaseBatchSizes = [20, 100];

releaseSettings.subscribe(
  ($releaseSettings: ReleaseSettings | undefined): void => {
    void (async (): Promise<void> => {
      if ($releaseSettings === undefined) {
        releaseResults.set(undefined);
        return;
      }

      const theReleaseResults: TabResults<Release> =
        await $releaseSettings.getResults<Release>(
          narrow.get() ? releaseBatchSizes[0] : releaseBatchSizes[1],
          0
        );
      releaseResults.set(theReleaseResults);
    })();
  }
);

export async function getNextReleaseResultsBatch(): Promise<void> {
  const theReleaseResults: TabResults<Release> = releaseResults.get()!;

  const nextBatch: TabResults<Release> = await releaseSettings
    .get()!
    .getResults<Release>(
      narrow.get() ? releaseBatchSizes[0] : releaseBatchSizes[1],
      theReleaseResults.results.length
    );

  theReleaseResults.results = theReleaseResults.results.concat(
    nextBatch.results
  );

  releaseResults.set(theReleaseResults);
}
