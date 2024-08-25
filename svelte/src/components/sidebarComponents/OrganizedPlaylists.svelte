<!--svelte-ignore a11y-click-events-have-key-events-->
<div class="org-playlists">
  <ul class="playlists">
    <li class="top-level">
      <button
        on:click|preventDefault="{() => viewAlbums()}"
        class:active="{$view === 'albums'}">
        <Fa icon="{faCompactDisc}" fw />
        Albums
      </button>
    </li>

    <li class="top-level">
      <button
        on:click|preventDefault="{() => viewPlays()}"
        class:active="{$view === 'plays'}">
        <Fa icon="{faPlay}" fw />
        Plays
      </button>
    </li>

    <li class="top-level">
      <button
        on:click|preventDefault="{() => viewReleases()}"
        class:active="{$view === 'releases'}">
        <Fa icon="{faRss}" fw />
        Releases
        {#if $nNewReleases != null}
          <span>{$nNewReleases}</span>
        {/if}
      </button>
    </li>

    <fieldset>
      <legend>Unsorted</legend>

      {#each $organizedPlaylists.nakedPlaylists as playlist}
        <SidebarPlaylist playlist="{playlist}" />
      {/each}
    </fieldset>

    {#each $organizedPlaylists.playlistFolders as pf}
      <fieldset class="expandable">
        <legend
          class="expand-toggle"
          on:click="{() => {
            playlistFolderExpanded[pf.id] = !playlistFolderExpanded[pf.id];
          }}">
          {pf.name}
          {#if playlistFolderExpanded[pf.id]}[-]{:else}[+]{/if}
        </legend>

        {#if playlistFolderExpanded[pf.id]}
          <div transition:slide="{{ duration: 100 }}">
            {#each pf.playlists as playlist}
              <SidebarPlaylist playlist="{playlist}" />
            {/each}
          </div>
        {/if}
      </fieldset>
    {/each}
  </ul>
</div>

<script lang="ts">
import {
  faCompactDisc,
  faRss,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import { onDestroy, onMount } from 'svelte';
import { slide } from 'svelte/transition';
import {
  DB,
  getNNewReleases,
  nNewReleases,
  organizedPlaylists,
  type PlaylistFolder,
  view,
  viewAlbums,
  viewPlays,
  viewReleases
} from "../../internal";
import SidebarPlaylist from './SidebarPlaylist.svelte';

let playlistFolderExpanded: Record<number, boolean>;
let nNewReleasesUpdater: number | null = null;

$: playlistFolderExpanded = Object.fromEntries(
  $organizedPlaylists.playlistFolders.map(
    (pf: PlaylistFolder): [number, boolean] => {
      return [pf.id, true];
    }
  )
);

onMount(async (): Promise<void> => {
  window.setTimeout(setNNewReleases, 1000);
  nNewReleasesUpdater ||= window.setInterval(setNNewReleases, 60 * 60 * 1000);
});

onDestroy((): void => {
  if (nNewReleasesUpdater != null) window.clearInterval(nNewReleasesUpdater);
});

async function setNNewReleases(): Promise<void> {
  if (DB.online) nNewReleases.set(await getNNewReleases())
}
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

ul.playlists {
  list-style-type: none;
  margin: 0;
  padding: 0;

  fieldset {
    margin-top: 15px;
  }

  li {
    color: colors.$gray-text;
    margin: 0 10px 0 20px;

    &.top-level {
      margin: 0;
    }

    button {
      display: flex;
      padding: 4px 0;
      font-size: 13px;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      color: colors.$gray-text;
      line-height: 1.2;

      @media (hover: hover) {
        &:hover {
          color: white;
        }
      }

      @media screen and (max-width: dims.$mobile-cutoff) {
        padding: 10px 0;
      }

      &.active {
        color: white;
      }

      &.playing {
        svg {
          color: colors.$highlight;
        }
      }

      &:focus {
        outline: none;
      }

      svg {
        margin-top: 1px;
        margin-right: 6px;
      }

      &.quick-match {
        text-underline-offset: 3px;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-decoration-color: white;

        &.quick-match-active {
          text-decoration-color: colors.$yellow-star;
          border-right: solid transparent 0; // redraw hack
        }
      }

      & > span {
        margin-left: 10px;
        font-size: 11px;
        display: inline-block;
        vertical-align: middle;
        padding: 2px 5px;
        border-radius: 5px;
        background-color: #999;
        color: colors.$dark-gray;
      }
    }
  }
}
</style>
