{#if $authed}
  <div id="track-dragger"></div>

  <div id="everything" class:playing="{$playingTrack != null}">
    <Toolbar />

    <div id="aside-main">
      {#if !$narrow}
        <aside>
          <OrganizedPlaylists />
        </aside>
      {/if}

      <main tabindex="-1">
        <div id="toast-container" style="bottom: {toastContainerBottom}px">
          <SvelteToast options="{toastOptions}" />
        </div>

        <div id="player-container" bind:clientHeight="{toastContainerBottom}">
          <Player />
        </div>

        <div id="view" tabindex="-1">
          {#if $view === 'albums'}
            <Albums />
          {:else if $view === 'releases'}
            <Releases />
          {:else}
            <Tracks />
          {/if}
        </div>

        {#if $activePane === 'help'}
          <Help />
        {:else if $activePane === 'import-queue'}
          <ImportQueue />
        {:else if $activePane === 'playlist-selector'}
          <PlaylistSelector />
        {:else if $activePane === 'command-bar'}
          <CommandBar />
        {:else if $activePane === 'play-queue'}
          <PlayQueue />
        {:else if $activePane === 'col-selector'}
          <ColSelector />
        {:else if $activePane === 'tag-editor'}
          <TagEditor />
        {:else if $activePane === 'title-parser'}
          <TitleParser />
        {:else if $activePane === 'search-replace'}
          <SearchReplace />
        {:else if $activePane === 'playlists-editor'}
          <PlaylistsEditor />
        {:else if $activePane === 'this-that'}
          <ThisThat />
        {/if}
      </main>
    </div>
  </div>
{:else}
  <Auth />
  <div id="auth-toast-container">
    <SvelteToast options="{toastOptions}" />
  </div>
{/if}

<Prompt />

<svelte:window
  on:keyup="{keyUp}"
  on:keydown="{keyDown}"
  on:focus="{focusWindow}"
  bind:innerWidth="{innerWidth}"
  bind:innerHeight="{innerHeight}" />

<script lang="ts">
import { SvelteToast } from '@zerodevx/svelte-toast';
import { onMount } from 'svelte';
import './assets/custom.scss';
import './assets/forms.scss';
import './assets/global.scss';
import './assets/toast.scss';
import './assets/typography.scss';
import Albums from './components/albumComponents/Albums.svelte';
import Auth from './components/Auth.svelte';
import TagEditor from './components/editComponents/TagEditor.svelte';
import CommandBar from './components/modalComponents/CommandBar.svelte';
import Help from './components/modalComponents/Help.svelte';
import PlaylistsEditor from './components/modalComponents/PlaylistsEditor.svelte';
import Prompt from './components/modalComponents/Prompt.svelte';
import Player from './components/playerComponents/Player.svelte';
import PlayQueue from './components/playerComponents/PlayQueue.svelte';
import Releases from './components/releaseComponents/Releases.svelte';
import ColSelector from './components/sidebarComponents/ColSelector.svelte';
import OrganizedPlaylists from './components/sidebarComponents/OrganizedPlaylists.svelte';
import PlaylistSelector from './components/sidebarComponents/PlaylistSelector.svelte';
import Toolbar from './components/Toolbar.svelte';
import ImportQueue from './components/trackComponents/ImportQueue.svelte';
import Tracks from './components/trackComponents/Tracks.svelte';
import SearchReplace from './components/trackToolsComponents/SearchReplace.svelte';
import ThisThat from './components/trackToolsComponents/ThisThat.svelte';
import TitleParser from './components/trackToolsComponents/TitleParser.svelte';
import {
  activePane,
  authed,
  cachedTrackIds,
  checkAuth,
  getOfflineMp3s,
  getOrganizedPlaylists,
  initPlayer,
  keyboard,
  keyDown,
  keyUp,
  narrow,
  organizedPlaylists,
  playingTrack,
  setCurrentPlaylist,
  short,
  view,
} from './internal';

let toastContainerBottom = 0;

const toastOptions = {
  dismissable: false,
  reversed: true,
  duration: 3000,
  intro: { y: 192 },
};

let innerWidth: number = window.innerWidth;
let innerHeight: number = window.innerHeight;

$: narrow.set(innerWidth <= 1300);
$: short.set(innerHeight <= 600);

onMount(async (): Promise<void> => {
  await checkAuth();
  if (!$authed) return;

  activePane.set('main');
  organizedPlaylists.set(await getOrganizedPlaylists());

  if (import.meta.env.VITE_ENV !== 'dev') {
    await Notification.requestPermission();
  }

  (document.activeElement as HTMLElement).blur();

  if (window.location.hash.substring(1) === 'releases') {
    view.set('releases');
  } else if (window.location.hash.substring(1) === 'albums') {
    view.set('albums');
  } else {
    const savedTrackSettingsItem: string | null =
      localStorage.getItem('track-settings');

    if (savedTrackSettingsItem != null) {
      const savedTrackSettings: Record<string, any> = JSON.parse(
        savedTrackSettingsItem
      );

      const playlistId: number | null = savedTrackSettings.playlistId;
      if (playlistId != null) await setCurrentPlaylist(playlistId);
    }

    view.set('tracks');
  }

  cachedTrackIds.set(new Set(await getOfflineMp3s()));

  await initPlayer();
});

function focusWindow(): void {
  keyboard.set({ shiftPressed: false, cmdPressed: false });
}
</script>
