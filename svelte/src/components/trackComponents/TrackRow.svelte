{#if $narrow}
  <tr
    id="{`track-${rix}`}"
    data-rix="{rix}"
    class="{camelToKebabCase(row.genreColor ?? '')}"
    class:expanded="{expanded}"
    class:selected="{$selectedTrackIds.has(row.id)}"
    class:playing="{$currentPlaylist?.id === $playingPlaylist?.id &&
      $playingTrack?.id === row.id}"
    on:click="{async () => await processTrackRowClick()}">
    <td>
      <div class="fields">
        <dl>
          {#each Object.keys(trackFields) as field}
            {#if trackFields[field].mobileDisplayed && row[field] != null}
              <dt class="{field}">{trackFields[field].displayName}</dt>
              <dd
                class="{field}"
                class:truncatable="{trackFields[field].truncatable &&
                  !expanded}">
                <TrackCol field="{field}" track="{row}" />
              </dd>
            {/if}
          {/each}
        </dl>

        {#if expanded}
          <dl class="more" transition:slide="{{ duration: 100 }}">
            {#each Object.keys(trackFields) as field}
              {#if !trackFields[field].mobileDisplayed && trackFields[field].displayed && row[field] != null}
                <dt class="{field}">{trackFields[field].displayName}</dt>
                <dd class="{field}">
                  <TrackCol field="{field}" track="{row}" />
                </dd>
              {/if}
            {/each}
          </dl>
        {/if}
      </div>

      <div class="actions">
        <a
          role="button"
          href="#top"
          on:click|stopPropagation="{() => (expanded = !expanded)}">
          <Fa icon="{expanded ? faChevronUp : faChevronDown}" fw size="2x" />
        </a>
      </div>
    </td>
  </tr>
{:else}
  <tr
    id="{`track-${rix}`}"
    class="{camelToKebabCase(row.genreColor ?? '')}"
    data-id="{row.id}"
    data-rix="{rix}"
    class:selected="{$selectedTrackIds.has(row.id)}"
    class:playing="{$currentPlaylist?.id === $playingPlaylist?.id &&
      $playingTrack?.id === row.id}"
    class:cutting="{$cutOrCopy === 'cut' && $tracksClipboard.includes(row.id)}"
    class:copying="{$cutOrCopy === 'copy' && $tracksClipboard.includes(row.id)}"
    on:mousemove="{(ev) => maybeDropTracks(ev)}"
    on:click="{async () => await processTrackRowClick()}">
    {#each Object.keys(trackFields) as field}
      {#if trackFields[field].displayed}
        <td
          class="{camelToKebabCase(field)}"
          class:truncatable="{trackFields[field].truncatable}"
          class:numeric="{trackFields[field].numeric}">
          <TrackCol field="{field}" track="{row}" />
        </td>
      {/if}
    {/each}
  </tr>
{/if}

<script lang="ts">
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import { slide } from 'svelte/transition';
import {
  camelToKebabCase,
  currentPlaylist,
  cutOrCopy,
  cutOrCopyFromPlaylistId,
  multiSelecting,
  narrow,
  pasteTracks,
  playingPlaylist,
  playingTrack,
  removeDragClass,
  selectedTrackIds,
  selectTrack,
  startPlayingInPlaylist,
  type Track,
  trackFields,
  tracksClipboard,
} from '../../internal';
import TrackCol from './TrackCol.svelte';

export let row: Track;
export let rix: number;
let expanded = false;
let justClicked = false;
let pasteRix: number;

async function processTrackRowClick(): Promise<void> {
  if ($multiSelecting) {
    selectTrack(row, rix);
  } else if (
    $cutOrCopy === 'cut' ||
    ($cutOrCopy === 'copy' && $cutOrCopyFromPlaylistId !== $currentPlaylist.id)
  ) {
    await pasteTracks(null, pasteRix);
  } else {
    selectTrack(row, rix);

    if (justClicked && $selectedTrackIds.size === 1) {
      await startPlayingInPlaylist(row);
    }

    justClicked = true;

    setTimeout((): void => {
      justClicked = false;
    }, 600);
  }
}

function maybeDropTracks(ev: DragEvent | MouseEvent): void {
  let target: Element | null = ev.currentTarget! as Element | null;
  pasteRix = rix;

  let targetBounds: DOMRect = target!.getBoundingClientRect();

  if (ev.y < targetBounds.bottom - targetBounds.height / 2) {
    pasteRix -= 1;
    // eslint-disable-next-line
    target = target?.previousElementSibling as Element | null;
    if (target == null) target = document.getElementById('tab-sorters')!;
  }

  removeDragClass();
  target!.classList.add('cursor-below');
}
</script>
