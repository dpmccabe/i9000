<tr
  id="{`album-${rix}`}"
  class="{camelToKebabCase(row.genreColor ?? '')}"
  class:expanded="{expanded}"
  on:click="{() => {
    if ($narrow) expanded = !expanded;
  }}"
  on:dblclick="{async () => {
    if (!$narrow) await goToAlbum(row);
  }}">
  {#if $narrow}
    <td>
      <div class="fields">
        <dl>
          {#each Object.keys(albumFields) as field}
            {#if albumFields[field].mobileDisplayed && row[field] != null}
              <dt class="{field}">{albumFields[field].displayName}</dt>
              <dd
                class="{field}"
                class:truncatable="{albumFields[field].truncatable &&
                  !expanded}">
                {formattedField(field)}
              </dd>
            {/if}
          {/each}
        </dl>

        {#if expanded}
          <dl class="more" transition:slide="{{ duration: 100 }}">
            {#each Object.keys(albumFields) as field}
              {#if !albumFields[field].mobileDisplayed && row[field] != null}
                <dt class="{field}">{albumFields[field].displayName}</dt>
                <dd class="{field}">{formattedField(field)}</dd>
              {/if}
            {/each}
          </dl>
        {/if}
      </div>

      <div class="actions">
        <a
          role="button"
          href="#top"
          on:click|stopPropagation="{() => goToAlbum(row)}">
          <Fa icon="{faArrowCircleRight}" fw size="2x" />
        </a>
      </div>
    </td>
  {:else}
    {#each Object.keys(albumFields) as field}
      {#if albumFields[field].displayed}
        <td
          class="{camelToKebabCase(field)}"
          class:truncatable="{albumFields[field].truncatable}"
          class:numeric="{albumFields[field].numeric}">
          {#if row[field] != null}{formattedField(field)}{/if}
        </td>
      {/if}
    {/each}
  {/if}
</tr>

<script lang="ts">
import { faArrowCircleRight } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import { slide } from 'svelte/transition';
import {
  type Album,
  albumFields,
  camelToKebabCase,
  createPlaylist,
  getAlbumTrackIds,
  narrow,
  type Playlist,
  playlists,
  setCurrentPlaylist,
} from '../../internal';

export let row: Album;
export let rix: number;
let expanded = false;

function formattedField(field: string): string {
  return albumFields[field].formatter == null
    ? (row[field] as string)
    : albumFields[field].formatter(row[field]);
}

async function goToAlbum(album: Album): Promise<void> {
  const trackIds: string[] = await getAlbumTrackIds(
    album.albumArtist,
    album.album
  );

  const albumPlaylistName: string = [album.albumArtist, album.album].join(
    ' · '
  );

  const albumPlaylist: Playlist =
    $playlists.find((p: Playlist): boolean => p.name === albumPlaylistName) ??
    (await createPlaylist(albumPlaylistName, trackIds));

  await setCurrentPlaylist(albumPlaylist.id);
}
</script>
