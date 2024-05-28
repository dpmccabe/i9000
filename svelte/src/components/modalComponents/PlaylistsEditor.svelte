<Modal id="playlists-editor">
  <span slot="title">Edit Playlists</span>

  <div slot="content">
    <form on:submit|preventDefault="{() => updatePlaylistOrg()}">
      <textarea bind:this="{textArea}" bind:value="{opTemplate}"></textarea>

      <button type="submit" disabled="{working}" class:working="{working}"
        ><span>Update</span>
        <Fa icon="{faSpinner}" size="sm" spin /></button>
    </form>
  </div>
</Modal>

<script lang="ts">
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { onDestroy, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  activePane,
  allPlaylistName,
  organizedPlaylists,
  type Playlist,
  type PlaylistFolder,
  playlists,
  setPlaylistsOrganization,
} from '../../internal';
import Modal from './Modal.svelte';

let opTemplate = '';
let textArea: HTMLTextAreaElement;
let working = false;

onMount((): void => {
  const newOpTemplate: string[] = [];

  for (const pf of $organizedPlaylists.playlistFolders) {
    newOpTemplate.push(pf.name);

    for (const p of pf.playlists) {
      newOpTemplate.push(`-${p.name}`);
    }
  }

  newOpTemplate.push('---');

  for (const p of $organizedPlaylists.nakedPlaylists) {
    if (p.name !== allPlaylistName) {
      newOpTemplate.push(`-${p.name}`);
    }
  }

  opTemplate = newOpTemplate.join('\n') + '\n';
  textArea.focus();
});

onDestroy((): void => {
  working = false;
});

async function updatePlaylistOrg(): Promise<void> {
  if (working) return;

  working = true;

  const folderIdNameMap: Record<string, number> =
    $organizedPlaylists.playlistFolders.reduce(
      (
        acc: Record<string, number>,
        pf: PlaylistFolder
      ): Record<string, number> => {
        acc[pf.name] = pf.id;
        return acc;
      },
      {}
    );

  const playlistIdNameMap: Record<string, number> = $playlists.reduce(
    (acc: Record<string, number>, pf: Playlist): Record<string, number> => {
      acc[pf.name] = pf.id;
      return acc;
    },
    {}
  );

  let inFolderId: number | null = null;
  let folderIx = 0;
  let playlistInFolderIx: number | null = null;
  let nakedPlaylistIx: number | null = null;

  const foldersPatch: { id: number; ix: number }[] = [];
  const playlistsPatch: {
    id: number;
    playlistFolderId: number | null;
    ix: number;
  }[] = [];

  textArea.value.split('\n').forEach((line: string): void => {
    line = line.trim();

    if (line.length === 0) {
      return;
    } else if (line === '---') {
      inFolderId = null;
      nakedPlaylistIx = 1;
    } else if (line.startsWith('-')) {
      if (inFolderId == null) {
        playlistsPatch.push({
          id: playlistIdNameMap[line.substring(1)],
          playlistFolderId: null,
          ix: nakedPlaylistIx!,
        });

        nakedPlaylistIx++;
      } else {
        playlistsPatch.push({
          id: playlistIdNameMap[line.substring(1)],
          playlistFolderId: inFolderId,
          ix: playlistInFolderIx!,
        });

        playlistInFolderIx++;
      }
    } else {
      inFolderId = folderIdNameMap[line];
      foldersPatch.push({ id: inFolderId, ix: folderIx });
      folderIx++;
      playlistInFolderIx = 0;
    }
  });

  await setPlaylistsOrganization(foldersPatch, playlistsPatch);

  activePane.set('main');
}
</script>

<style lang="scss" global>
#playlists-editor {
  width: 500px;

  form {
    textarea {
      width: 100%;
      height: 500px;
    }

    button[type='submit'] {
      margin: 0.5rem auto 0 !important;
    }
  }
}
</style>
