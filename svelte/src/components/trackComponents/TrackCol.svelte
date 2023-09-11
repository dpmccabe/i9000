{#if field === 'artist'}
  {#if track.artist === track.albumArtist}
    {track.artist}
  {:else if track.artist}
    <span class="less-imp">{track.albumArtist}:</span>
    {track.artist}
  {/if}
{:else if field === 'track'}
  {#if track.trackI}
    {track.trackI}{#if track.trackN}
      <span class="less-imp slash">/</span>{track.trackN}
    {/if}
  {/if}
{:else if field === 'disc'}
  {#if track.discI}
    {track.discI}{#if track.discN}
      <span class="less-imp slash">/</span>{track.discN}
    {/if}
  {/if}
{:else if field === 'rating'}
  {#if track.rating}
    <span class="r-{track.rating}">{'★'.repeat(track.rating)}</span>
  {/if}
{:else if track[field] != null}{formattedField(field)}{/if}

<script lang="ts">
import { type Track, trackFields } from '../../internal';

export let field: string;
export let track: Track;

function formattedField(field: string): string {
  return trackFields[field].formatter == null
    ? (track[field] as string)
    : trackFields[field].formatter(track[field]);
}
</script>
