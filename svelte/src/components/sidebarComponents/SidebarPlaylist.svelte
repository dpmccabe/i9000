<li>
  <button
    class:active="{$view === 'tracks' && playlist.id === $currentPlaylist?.id}"
    class:non-playlist="{playlist.name === 'Songs'}"
    class:quick-match="{$playlistQuickSelectMatches.includes(playlist)}"
    class:quick-match-active="{$playlistQuickSelectMatches[
      $playlistQuickSelectPos
    ] === playlist}"
    class:pasting="{canPasteInto}"
    class:playing="{playlist.id === $playingPlaylistId}"
    on:mouseenter="{() => {
      hovering = true;
    }}"
    on:mouseleave="{() => {
      hovering = false;
    }}"
    on:click|preventDefault="{clickOrPasteInto}">
    <Fa icon="{hovering && canPasteInto ? faPaste : icon}" fw />
    {playlist.name}
  </button>
</li>

<script lang="ts">
import { faListOl, faMusic, faPaste } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  allPlaylistName,
  currentPlaylist,
  playingPlaylistId,
  type Playlist,
  playlistQuickSelectMatches,
  playlistQuickSelectPos,
  setCurrentPlaylist,
  view,
  cutOrCopy,
  cutOrCopyFromPlaylistId,
  pasteTracks,
  keyboard,
} from '../../internal';

export let playlist: Playlist;
let icon: Fa = playlist?.name === allPlaylistName ? faMusic : faListOl;
let canPasteInto = false;
let hovering = false;

$: {
  canPasteInto =
    playlist?.name !== allPlaylistName &&
    $cutOrCopy != null &&
    $cutOrCopyFromPlaylistId !== playlist?.id &&
    $keyboard.cmdPressed;
}

async function clickOrPasteInto(): Promise<void> {
  if (canPasteInto) {
    await pasteTracks(playlist);
  } else {
    await setCurrentPlaylist(playlist.id);
  }
}
</script>
