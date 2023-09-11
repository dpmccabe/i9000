<div class="{['ackstate', ackstate].join(' ')}">
  <a
    href="#top"
    role="button"
    class="new"
    on:click|preventDefault="{ack(release, 'new')}"
    ><Fa icon="{faInbox}" fw size="1.5x" /></a>
  <a
    href="#top"
    role="button"
    class="todo"
    on:click|preventDefault="{ack(release, 'todo')}"
    ><Fa icon="{faCartArrowDown}" fw size="1.5x" /></a>
  <a
    href="#top"
    role="button"
    class="acked"
    on:click|preventDefault="{ack(release, 'acked')}"
    ><Fa icon="{faCheck}" fw size="1.5x" /></a>
</div>

<script lang="ts">
import {
  faCartArrowDown,
  faCheck,
  faInbox,
} from '@fortawesome/free-solid-svg-icons';
import { onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  ackRelease,
  type Ackstate,
  logMessage,
  type Release,
} from '../../internal';

export let release: Release;
let ackstate: Ackstate;

onMount((): void => {
  ackstate = release.ackstate;
});

async function ack(release: Release, newAckstate: Ackstate): Promise<void> {
  logMessage(`Marking ${release.title} as ${newAckstate}&hellip;`);
  await ackRelease(release.id, newAckstate);
  ackstate = newAckstate;
}
</script>
