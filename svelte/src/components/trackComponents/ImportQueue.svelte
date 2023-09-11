<Modal id="help">
  <span slot="title">Import Queue</span>

  <div slot="content">
    <div
      id="import-queue"
      on:dragover|preventDefault="{(ev) => maybeDropTracks(ev)}"
      on:dragleave="{removeDragClass}"
      on:drop|preventDefault="{(ev) => dropTracks(ev)}">
      <a
        href="#top"
        class="m-closer"
        role="button"
        on:click|preventDefault="{() => cleanImportQueue()}"
        ><Fa icon="{faBroom}" fw size="lg" /></a>

      <table>
        <tbody>
          {#each [...$importingMp3s] as [filename, impMp3]}
            <tr>
              <td class="remove">
                <a
                  href="#top"
                  role="button"
                  on:click|preventDefault="{() =>
                    removeFromImportQueue(filename)}"
                  ><Fa icon="{faClose}" fw /></a>
              </td>
              <td class="filename truncatable">{filename}</td>
              <td class="size">{megabytes(impMp3.file.size)}</td>
              <td class="{['state', 'truncatable', impMp3.state].join(' ')}">
                {#if impMp3.state === 'uploading'}
                  Uploading&hellip;
                {:else if impMp3.state === 'success'}
                  {impMp3.track.trackI ?? '0'}.
                  {impMp3.track.title}
                {:else if ['retrying', 'failed'].includes(impMp3.state)}
                  {#if impMp3.failureMsg != null}{impMp3.failureMsg}{/if}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</Modal>

<script lang="ts">
import { faBroom, faClose } from '@fortawesome/free-solid-svg-icons';
import { onDestroy, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  cleanImportQueue,
  clearImportingFn,
  getAllArtistGenres,
  importingMp3s,
  importTracks,
  removeFromImportQueue,
} from '../../internal';
import Modal from '../modalComponents/Modal.svelte';

let artistGenres: Map<string, string>;

onMount(async (): Promise<void> => {
  artistGenres = await getAllArtistGenres();
});

onDestroy((): void => {
  clearImportingFn();
});

function removeDragClass(): void {
  document.getElementById('import-queue')!.classList.remove('dragging-onto');
}

function maybeDropTracks(ev: DragEvent | MouseEvent): void {
  if (!('dataTransfer' in ev && ev.dataTransfer!.items.length > 0)) {
    return;
  }

  document.getElementById('import-queue')!.classList.add('dragging-onto');
}

async function dropTracks(ev: DragEvent): Promise<void> {
  if (ev.dataTransfer!.items.length === 0) {
    return;
  }

  document.getElementById('import-queue')!.classList.remove('dragging-onto');

  importTracks(await getFilesDataTransferItems(ev), artistGenres);
}

async function getFilesDataTransferItems(ev: DragEvent) {
  const dataTransferItemKeys: string[] = Object.keys(ev.dataTransfer.items);
  let fileEntries: FileSystemEntry[] = [];

  await Promise.all(
    dataTransferItemKeys.map(async (k: string): Promise<void> => {
      const item: DataTransferItem = ev.dataTransfer.items[k];
      const entry: FileSystemEntry = item.webkitGetAsEntry();
      if (!entry) return;

      if (entry.isFile) {
        fileEntries.push(entry);
      } else if (entry.isDirectory) {
        return await walkDirRecursively(entry.createReader());
      }
    })
  );

  function walkDirRecursively(
    directoryReader: FileSystemDirectoryReader
  ): Promise<void> {
    return new Promise(async (resolve): Promise<void> => {
      directoryReader.readEntries(async (entries: FileSystemEntry[]) => {
        await Promise.all(
          entries.map(async (entry: FileSystemEntry): Promise<void> => {
            if (entry.isFile) {
              fileEntries.push(entry);
            } else if (entry.isDirectory) {
              await walkDirRecursively(entry.createReader());
            }
          })
        );

        resolve();
      });
    });
  }

  fileEntries = fileEntries.sort(
    (a: FileSystemEntry, b: FileSystemEntry): number => {
      return a.fullPath.localeCompare(b.fullPath);
    }
  );

  const files: Promise<File>[] = fileEntries.map(
    (fileEntry: FileSystemEntry): Promise<File> => {
      return new Promise(async (resolve) => {
        fileEntry.file((f: File): void => {
          f.filepath = fileEntry.fullPath.substring(1).replaceAll(/\//g, ' | ');
          resolve(f);
        });
      });
    }
  );

  return await Promise.all(files);
}

function megabytes(x: number): string {
  return (x / 1024 / 1024).toFixed(1).toString() + ' MB';
}
</script>

<style lang="scss" global>
@use '../../assets/colors';

#import-queue {
  width: 1000px;
  height: 500px;
  overflow-y: auto;
  position: relative;
  padding-right: 60px;

  &.dragging-onto {
    background-color: colors.$highlight-darker;
  }

  a.m-closer {
    display: block;
    position: absolute;
    z-index: 1002;
    right: 0;
    top: 0;
    padding: 15px;
    color: colors.$dim-text;

    @media (hover: hover) {
      &:hover {
        color: white;
      }
    }
  }

  table {
    width: 100%;
    margin-top: 5px;
    font-size: 13px;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;

    td {
      padding: 0 8px;
      vertical-align: middle;
      text-align: left;

      &.filename {
        width: 50%;
        padding-left: 0;
      }

      &.size {
        width: 7em;
      }

      &.state {
        width: 50%;
        padding-right: 0;

        &.uploading {
          color: white;
        }

        &.success {
          color: #ccebc5;
        }

        &.retrying {
          color: desaturate(#fbb4ae, 50);
        }

        &.failed {
          color: #fbb4ae;
        }
      }

      &.remove {
        width: 3em;
      }
    }
  }
}
</style>
