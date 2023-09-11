<!--eslint-disable svelte/no-at-html-tags -->
<div id="current-track-info">
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

  <AutosizedText
    id="current-artist"
    maxHeightPx="{75}"
    lineHeight="1.2"
    maxFontSizePx="{40}">
    {#if track.artist === track.albumArtist}
      {track.artist}
    {:else if track.artist}
      <span class="less-imp">{track.albumArtist}:</span>
      {track.artist}
    {/if}
  </AutosizedText>

  {#if track.album}
    <AutosizedText
      id="current-album"
      maxHeightPx="{35}"
      lineHeight="1.4"
      maxFontSizePx="{25}">
      {track.album}
      <span class="less-imp">{@html discAndTrack(track)}</span>
    </AutosizedText>
  {/if}

  <AutosizedText
    id="current-title"
    maxHeightPx="{60}"
    lineHeight="1.4"
    maxFontSizePx="{35}">
    {track.title}
    <span id="current-rating">{'★'.repeat(track.rating)}</span>
  </AutosizedText>
</div>

<script lang="ts">
import {
  activePane,
  discAndTrack,
  queuePosition,
  type Track,
} from '../../internal';
import AutosizedText from '../AutosizedText.svelte';

export let track: Track;
</script>
