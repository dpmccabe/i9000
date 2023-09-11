<!--eslint-disable svelte/no-at-html-tags -->
<div id="current-track-info">
  <div id="current-artist-and-qp">
    <div id="current-artist-and-title">
      <span id="current-artist" class="truncatable">
        {#if track.artist === track.albumArtist}
          {track.artist}
        {:else if track.artist}
          <span class="less-imp">{track.albumArtist}:</span>
          {track.artist}
        {/if}
      </span>

      <span id="artist-title-sep">&centerdot;</span>

      <span id="current-title" class="truncatable">{track.title}</span>

      <div id="current-icons">
        {#if track.rating}
          <span id="current-rating">{'★'.repeat(track.rating)}</span>
        {/if}

        {#if track.cached}
          <Fa icon="{faCloudDownloadAlt}" />
        {/if}
      </div>
    </div>

    <div id="queue-position">
      {#if $queuePosition != null}
        <a
          href="#top"
          role="button"
          on:click|preventDefault="{() => activePane.set('play-queue')}">
          ({$queuePosition[0] + 1}<span class="slash less-imp">/</span
          >{$queuePosition[1] + 1})
        </a>
      {/if}
    </div>
  </div>

  {#if track.album}
    <div id="current-album" class="truncatable">
      {track.album}
      <span class="less-imp">{@html discAndTrack(track)}</span>
    </div>
  {/if}
</div>

<script lang="ts">
import { faCloudDownloadAlt } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  activePane,
  discAndTrack,
  queuePosition,
  type Track,
} from '../../internal';

export let track: Track;
</script>
