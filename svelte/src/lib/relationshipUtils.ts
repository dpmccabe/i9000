import {
  narrow,
  type Relationship,
  relationshipResults,
  type RelationshipSettings,
  relationshipSettings,
  type TabResults,
} from '../internal';

const relationshipBatchSizes = [20, 100];

relationshipSettings.subscribe(
  ($relationshipSettings: RelationshipSettings | undefined): void => {
    void (async (): Promise<void> => {
      if ($relationshipSettings === undefined) {
        relationshipResults.set(undefined);
        return;
      }

      const theRelationshipResults: TabResults<Relationship> =
        await $relationshipSettings.getResults<Relationship>(
          narrow.get() ? relationshipBatchSizes[0] : relationshipBatchSizes[1],
          0
        );
      relationshipResults.set(theRelationshipResults);
    })();
  }
);

export async function getNextRelationshipResultsBatch(): Promise<void> {
  const theRelationshipResults: TabResults<Relationship> =
    relationshipResults.get()!;

  const nextBatch: TabResults<Relationship> = await relationshipSettings
    .get()!
    .getResults<Relationship>(
      narrow.get() ? relationshipBatchSizes[0] : relationshipBatchSizes[1],
      theRelationshipResults.results.length
    );

  theRelationshipResults.results = theRelationshipResults.results.concat(
    nextBatch.results
  );

  relationshipResults.set(theRelationshipResults);
}
