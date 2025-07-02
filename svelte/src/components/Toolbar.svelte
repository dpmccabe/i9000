<nav>
  <div id="stats-content">{$statsContent}</div>

  <div class="sep"></div>

  <button title="Refresh" on:click|preventDefault="{() => location.reload()}">
    <Fa icon="{faRefresh}" fw />
  </button>

  <div class="sep"></div>

  <div class="group">
    <button
      title="Go to now playing"
      disabled="{$playingTrack == null}"
      on:click|preventDefault="{async () => await selectPlayingTrack()}">
      <Fa icon="{faArrowAltCircleRight}" fw />
    </button>

    <div class="sep"></div>

    <button
      title="Select multiple"
      disabled="{$view !== 'tracks'}"
      class:active="{$multiSelecting}"
      on:click|preventDefault="{() => {
        $multiSelecting = !$multiSelecting;
      }}">
      <Fa icon="{faCheckDouble}" fw />
    </button>

    <button
      title="Select all"
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{selectAllTracks}">
      <Fa icon="{faObjectUngroup}" fw />
    </button>

    <button
      title="Select none"
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{deselectAllTracks}">
      <Fa icon="{farObjectUngroupReg}" fw />
    </button>

    <div class="sep"></div>

    <button
      title="Undo"
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{async () => await undoPlaylistTracksUpdate()}">
      <Fa icon="{faUndo}" fw />
    </button>

    <div class="sep"></div>

    <button
      title="Remove selected tracks"
      disabled="{$view !== 'tracks' || $selectedTrackIds.size === 0}"
      on:click|preventDefault="{async () => await removeSelectedTracks()}">
      <Fa icon="{faMinusCircle}" fw />
    </button>

    <button
      disabled="{$playingTrack == null || $queuePosition[0] === 0}"
      on:click|preventDefault="{() => clearRecentlyPlayedTracks()}">
      <Fa icon="{faBroom}" fw />
    </button>
  </div>

  <div class="sep"></div>

  <button
    title="Filter"
    on:click|preventDefault="{() => activePane.set('tab-filters')}">
    <Fa icon="{faFilter}" fw />
  </button>

  <div class="sep"></div>

  <div class="group">
    <button
      title="Regenerate P"
      on:click|preventDefault="{() => promptRobot()}">
      <Fa icon="{faRobot}" fw />
    </button>

    <button
      title="Shuffle playlist"
      class="grouped grouped grouped-last"
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{async () => await shuffleCurrentPlaylist()}">
      <Fa icon="{faRandom}" fw />
    </button>

    <button
      title="Interleave tracks in playlist"
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{async () => await interleaveCurrentPlaylist()}">
      <Fa icon="{faLayerGroup}" fw />
    </button>
  </div>

  <div class="sep"></div>

  <div class="group">
    <button
      title="Cut"
      class:active="{$cutOrCopy === 'cut'}"
      disabled="{$view !== 'tracks' || $cutOrCopy == 'copy'}"
      on:click|preventDefault="{() => maybeCutTracks()}">
      <Fa icon="{faCut}" fw />
    </button>

    <button
      title="Copy"
      class:active="{$cutOrCopy === 'copy'}"
      disabled="{$view !== 'tracks' || $cutOrCopy === 'cut'}"
      on:click|preventDefault="{() => maybeCopyTracks()}">
      <Fa icon="{faCopy}" fw />
    </button>

    <button
      title="Paste"
      disabled="{$view !== 'tracks' || $cutOrCopy == null}"
      on:click|preventDefault="{async () => await pasteTracks()}">
      <Fa icon="{faPaste}" fw />
    </button>
  </div>

  <div class="sep"></div>

  <div class="group">
    <button
      disabled="{$view !== 'tracks' || $selectedTrackIds.size === 0}"
      title="Edit tags"
      on:click|preventDefault="{() => prepEditTags()}">
      <Fa icon="{faTags}" fw />
    </button>

    <div class="sep"></div>

    <button
      title="Cache selected or playlist"
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{async () =>
        await safeCacheSelectedOrPlaylist()}">
      <Fa icon="{faCloudDownloadAlt}" fw />
    </button>
  </div>

  <div class="sep"></div>

  <button
    title="Show columns"
    on:click|preventDefault="{() => activePane.set('col-selector')}">
    <Fa icon="{faColumns}" fw />
  </button>

  <div class="sep"></div>

  <div class="group">
    <button on:click|preventDefault="{() => promptNewPlaylist()}">
      <Fa icon="{faPlus}" fw />
    </button>

    <button
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{() => promptRenamePlaylist()}">
      <Fa icon="{faPencilAlt}" fw />
    </button>

    <button
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{() => promptDeletePlaylist()}">
      <Fa icon="{faTrash}" fw />
    </button>

    <div class="sep"></div>

    <button
      title="Organize playlists"
      on:click|preventDefault="{() => activePane.set('playlists-editor')}">
      <Fa icon="{faFolderTree}" fw />
    </button>

    <div class="sep"></div>

    <button on:click|preventDefault="{() => promptNewFolder()}">
      <span class="fa-layers">
        <Fa icon="{faFolderBlank}" fw />
        <Fa icon="{faPlus}" fw color="#000" scale="{0.5}" translateY="{0.05}" />
      </span>
    </button>

    <button
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{() => promptRenameFolder()}">
      <span class="fa-layers">
        <Fa icon="{faFolderBlank}" fw />
        <Fa
          icon="{faPencilAlt}"
          fw
          color="#000"
          scale="{0.5}"
          translateY="{0.05}" />
      </span>
    </button>

    <button
      disabled="{$view !== 'tracks'}"
      on:click|preventDefault="{() => promptDeleteFolder()}">
      <span class="fa-layers">
        <Fa icon="{faFolderBlank}" fw />
        <Fa
          icon="{faTrash}"
          fw
          color="#000"
          scale="{0.5}"
          translateY="{0.05}" />
      </span>
    </button>
  </div>

  <div class="sep"></div>

  <button
    title="Command prompt"
    on:click|preventDefault="{() => activePane.set('command-bar')}">
    <Fa icon="{faTerminal}" fw />
  </button>

  <div class="sep"></div>

  <button title="Log out" on:click|preventDefault="{() => logOut()}">
    <Fa icon="{faSignOut}" fw />
  </button>
</nav>

<script lang="ts">
import { faObjectUngroup as farObjectUngroupReg } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowAltCircleRight,
  faBroom,
  faCheckDouble,
  faCloudDownloadAlt,
  faColumns,
  faCopy,
  faCut,
  faFilter,
  faFolderBlank,
  faFolderTree,
  faLayerGroup,
  faMinusCircle,
  faObjectUngroup,
  faPaste,
  faPencilAlt,
  faPlus,
  faRandom,
  faRefresh,
  faRobot,
  faSignOut,
  faTags,
  faTerminal,
  faTrash,
  faUndo,
} from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  activePane,
  authed,
  cacheSelectedOrPlaylist,
  clearRecentlyPlayedTracks,
  clearTracksClipboard,
  commands,
  copyTracks,
  currentPlaylist,
  cutOrCopy,
  cutTracks,
  deselectAllTracks,
  logMessage,
  multiSelecting,
  pasteTracks,
  playingTrack,
  prepEditTags,
  prompt,
  queuePosition,
  removeSelectedTracks,
  selectAllTracks,
  selectedTrackIds,
  selectPlayingTrack,
  statsContent,
  undoPlaylistTracksUpdate,
  view,
} from '../internal';

async function maybeCutTracks(): Promise<void> {
  if ($cutOrCopy === null) {
    await cutTracks();
  } else {
    clearTracksClipboard();
  }
}

async function maybeCopyTracks(): Promise<void> {
  if ($cutOrCopy === null) {
    await copyTracks();
  } else {
    clearTracksClipboard();
  }
}

async function safeCacheSelectedOrPlaylist(): Promise<void> {
  try {
    if (selectedTrackIds.get().size > 0) {
      await cacheSelectedOrPlaylist();
    } else {
      prompt.set({
        shown: true,
        title: 'Cache tracks',
        hasTextInput: true,
        textInputValue: '',
        textPlaceholder: 'hours',
        okAction: (): void => {
          const nHoursIn: string = $prompt!.textInputValue;

          if (nHoursIn !== '') {
            void (async (): Promise<void> => {
              await cacheSelectedOrPlaylist(parseInt(nHoursIn));
            })();
          }
        },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(e.message, 'error');
    }
  }
}

async function shuffleCurrentPlaylist(): Promise<void> {
  try {
    await commands.sh.handler('');
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(e.message, 'error');
    }
  }
}

async function interleaveCurrentPlaylist(): Promise<void> {
  try {
    await commands.int.handler('');
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(e.message, 'error');
    }
  }
}

function promptRobot(): void {
  prompt.set({
    shown: true,
    title: 'Regenerate robot playlists',
    hasTextInput: true,
    textInputValue: '',
    textPlaceholder: 'hours',
    okAction: (): void => {
      void (async (): Promise<void> => {
        await commands.ro.handler($prompt!.textInputValue ?? '');
      })();
    },
  });
}

function promptNewPlaylist(): void {
  prompt.set({
    shown: true,
    title: 'New playlist name',
    hasTextInput: true,
    textInputValue: '',
    textPlaceholder: 'new playlist name',
    okAction: (): void => {
      void (async (): Promise<void> => {
        await commands.np.handler($prompt!.textInputValue);
      })();
    },
  });
}

function promptRenamePlaylist(): void {
  const oldName: string = $currentPlaylist!.name;

  prompt.set({
    shown: true,
    title: `Rename ${oldName} to:`,
    hasTextInput: true,
    textInputValue: '',
    textPlaceholder: 'new playlist name',
    okAction: (): void => {
      void (async (): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        await commands.rp.handler(`${oldName}/${$prompt!.textInputValue}`);
      })();
    },
  });
}

function promptDeletePlaylist(): void {
  prompt.set({
    shown: true,
    title: `Delete ${$currentPlaylist!.name}?`,
    hasTextInput: false,
    okAction: (): void => {
      void (async (): Promise<void> => {
        await commands.dp.handler($currentPlaylist!.name);
      })();
    },
  });
}

function promptNewFolder(): void {
  prompt.set({
    shown: true,
    title: 'New folder name',
    hasTextInput: true,
    textInputValue: '',
    textPlaceholder: 'new folder name',
    okAction: (): void => {
      void (async (): Promise<void> => {
        await commands.npf.handler($prompt!.textInputValue);
      })();
    },
  });
}

function promptRenameFolder(): void {
  prompt.set({
    shown: true,
    title: 'Rename folder',
    hasTextInput: true,
    textInputValue: '',
    textPlaceholder: 'old folder name/new folder name',
    okAction: (): void => {
      void (async (): Promise<void> => {
        await commands.rpf.handler($prompt!.textInputValue);
      })();
    },
  });
}

function promptDeleteFolder(): void {
  prompt.set({
    shown: true,
    title: 'Delete folder',
    hasTextInput: true,
    textInputValue: '',
    textPlaceholder: 'folder name',
    okAction: (): void => {
      void (async (): Promise<void> => {
        await commands.dpf.handler($prompt!.textInputValue);
      })();
    },
  });
}

function logOut(): void {
  prompt.set({
    shown: true,
    title: 'Log out?',
    hasTextInput: false,
    okAction: (): void => {
      localStorage.clear();
      authed.set(false);
    },
  });
}
</script>

<style lang="scss" global>
@use '../assets/colors';
@use '../assets/dims';

nav {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  column-gap: 5px;
  padding: 0 15px;
  background-color: colors.$darkest-gray;
  height: dims.$nav-height;

  #stats-content {
    border-radius: 5px;
    background-color: colors.$med-gray;
    padding: 0 5px;
    font-size: 12px;
    width: 18em;
    height: 37px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    @media screen and (max-width: dims.$mobile-cutoff) {
      display: none;
    }

    span {
      text-align: center;
      display: block;
    }
  }

  button {
    color: colors.$gray-text;
    font-size: 18px;
    padding: 5px;
    background-color: transparent;
    border: none;
    cursor: pointer;

    &.m {
      display: none;
    }

    &.active {
      color: colors.$highlight;
    }

    &:disabled {
      opacity: 0.25;
      cursor: default;
    }

    @media (hover: hover) {
      &:enabled:hover {
        color: white;
      }
    }
  }

  .group {
    display: flex;
    flex-direction: row;
    border-radius: 5px;
    background-color: colors.$darkestest-gray;
    padding: 0 5px;
    align-items: center;

    .sep {
      margin-left: 5px;
      margin-right: 5px;
      height: 16px;
      width: 1px;
      background-color: colors.$med-gray;
    }
  }

  button,
  button .fa-layers {
    font-size: 12px;
  }

  @media screen and (min-width: 1300px) {
    button,
    button .fa-layers {
      font-size: 15px;
    }

    .group .sep {
      height: 18px;
    }
  }

  @media screen and (min-width: 1400px) {
    button,
    button .fa-layers {
      font-size: 18px;
    }

    .group .sep {
      height: 20px;
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    flex-direction: column;
    column-gap: unset;
    row-gap: 5px;
    padding: 15px;
    overflow-y: auto;
    height: unset;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    button.m {
      display: unset;
    }

    .group {
      flex-direction: column;

      .sep {
        margin-top: 5px;
        margin-bottom: 5px;
        height: 1px;
        width: 20px;
      }
    }

    button,
    button .fa-layers {
      font-size: 22px;
    }
  }
}
</style>
