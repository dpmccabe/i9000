<div class="actions">
  <a
    href="#top"
    role="button"
    on:click|preventDefault="{doCreateMbArtist(relationship)}"
    ><Fa icon="{faPlus}" fw size="1.5x" /></a>
  <a
    href="#top"
    role="button"
    class="{acked}"
    on:click|preventDefault="{ack(relationship)}"
    ><Fa icon="{faCheck}" fw size="1.5x" /></a>
</div>

<script lang="ts">
import { faCheck, faPlus } from '@fortawesome/free-solid-svg-icons';
import { onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  ackRelationship,
  createMbArtist,
  logMessage,
  relationshipSettings,
  type Relationship,
} from '../../internal';

export let relationship: Relationship;
let acked: boolean;

onMount((): void => {
  acked = relationship.acked;
});

async function ack(relationship: Relationship): Promise<void> {
  if (acked) {
    logMessage(`Unacknowledging ${relationship.otherArtist.name}`);
  } else {
    logMessage(`Acknowledging ${relationship.otherArtist.name}`);
  }

  await ackRelationship(relationship.id, !acked);
  acked = !acked;
}

async function doCreateMbArtist(relationship: Relationship): Promise<void> {
  logMessage(`Adding ${relationship.otherArtist.name} to artists`);

  await createMbArtist(
    relationship.otherArtist.id,
    relationship.otherArtist.name
  );

  relationshipSettings.touch();
}
</script>
