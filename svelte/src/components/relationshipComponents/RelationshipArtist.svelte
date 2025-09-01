<a
  href="{['https://musicbrainz.org/artist', artist.id].join('/')}"
  target="_blank"
  rel="noreferrer">{artist.name}</a>

{#if appSettings.get().lastfmUsername != null}
  <a
    href="{[
      'https://www.last.fm/user',
      appSettings.get().lastfmUsername,
      'library/music',
      encodeURIComponent(artist.name),
      '+albums',
    ].join('/')}"
    target="_blank"
    rel="noreferrer"
    class="lastfm"><Fa icon="{faLastfm}" /></a>
{/if}

<script lang="ts">
import { faLastfm } from '@fortawesome/free-brands-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import { appSettings, type Artist } from '../../internal';

export let artist: Artist;
</script>
