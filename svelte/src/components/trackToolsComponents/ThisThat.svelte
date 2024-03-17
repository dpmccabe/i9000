<Modal id="this-that">
  <span slot="title">This/that tag for {$nTracksSelected} track(s)</span>

  <div slot="content">
    <form on:submit|preventDefault="{() => doThisThat()}">
      <table>
        <thead>
          <tr>
            {#each ttCols as col}
              <th>
                <label for="{['tt', col].join('-')}">{col}</label>

                <select
                  id="{['tt', col].join('-')}"
                  bind:value="{$thisThatParseStrings[col]}">
                  <option value=""></option>
                  {#each ttCols as assignCol}
                    {#if assignCol !== col}
                      <option value="{assignCol}">{assignCol}</option>
                    {/if}
                  {/each}
                </select>
              </th>
            {/each}
          </tr>
        </thead>

        <tbody>
          {#each $thisThatTrackValues as v}
            <tr>
              {#each ttCols as col}
                <td>
                  {#if v.mod[col].old === ''}
                    &varnothing;
                  {:else}{v.mod[col].old}{/if}
                </td>
              {/each}
            </tr>

            <tr>
              {#each ttCols as col}
                <td class="new" class:changed="{v.mod[col].changed}">
                  {#if v.mod[col].new === ''}
                    &varnothing;
                  {:else}{v.mod[col].new}{/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>

      <button type="submit" disabled="{working}" class:working="{working}"
        >Update
        <Fa icon="{faSpinner}" size="sm" spin /></button>
    </form>
  </div>
</Modal>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */

import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { onDestroy } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  activePane,
  nTracksSelected,
  RetagOp,
  selectedTracks,
  type ThisThatMod,
  type Track,
  updateTracks,
  trackSettings,
} from '../../internal';
import {
  derived,
  type Readable,
  type Writable,
  writable,
} from '../../lib/tansuStore';
import Modal from '../modalComponents/Modal.svelte';

let working = false;

onDestroy((): void => {
  working = false;
});

async function doThisThat(): Promise<void> {
  if (working) return;

  working = true;
  await updateTagsFromThisThat();

  activePane.set('tracks');
  document.getElementById('tracks')?.focus();
}

const ttCols: string[] = [
  'title',
  'albumArtist',
  'artist',
  'album',
  'trackI',
  'grouping',
  'composer',
  'comments',
];

const thisThatParseStrings: Writable<Record<string, string>> = writable({
  title: '',
  albumArtist: '',
  artist: '',
  album: '',
  trackI: '',
  grouping: '',
  composer: '',
  comments: '',
});

const thisThatTrackValues: Readable<ThisThatMod[]> = derived(
  [selectedTracks, thisThatParseStrings],
  ([theSelectedTracks, theThisThatParseStrings]: [
    Track[],
    Record<string, string>
  ]): ThisThatMod[] => {
    return theSelectedTracks.map((t: Track): ThisThatMod => {
      const ttm: ThisThatMod = { id: t.id!, mod: {} };
      let anyChanged = false;

      for (const col of ttCols) {
        ttm.mod[col] = {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          old: t.getStaticProperty(col) ?? '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          new: t.getStaticProperty(col) ?? '',
          changed: false,
        };

        if (theThisThatParseStrings[col] !== '') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ttm.mod[col].new =
            t.getStaticProperty(theThisThatParseStrings[col]) ?? '';
          ttm.mod[col].changed = ttm.mod[col].old !== ttm.mod[col].new;
          anyChanged ||= ttm.mod[col].changed;
        }
      }

      ttm.anyChanged = anyChanged;

      return ttm;
    });
  },
  []
);

async function updateTagsFromThisThat(): Promise<void> {
  if (nTracksSelected.get() === 0) return;

  const patch: Record<string, any>[] = [];

  for (const ptv of thisThatTrackValues.get()!) {
    if (ptv.anyChanged) {
      const id3Payload: Record<string, any> = {};

      const thisPatch: Record<string, any> = {
        id: ptv.id,
        updatedAt: DateTime.now().toMillis(),
      };

      if (ptv.mod.title.changed) {
        id3Payload.title = ptv.mod.title.new;
        thisPatch.title = ptv.mod.title.new;
      }

      if (ptv.mod.albumArtist.changed) {
        id3Payload.albumartist = ptv.mod.albumArtist.new;
        thisPatch.albumArtist = ptv.mod.albumArtist.new;
      }

      if (ptv.mod.artist.changed) {
        id3Payload.artist = ptv.mod.artist.new;
        thisPatch.artist = ptv.mod.artist.new;
      }

      if (ptv.mod.album.changed) {
        id3Payload.album = ptv.mod.album.new;
        thisPatch.album = ptv.mod.album.new;
      }

      if (ptv.mod.trackI.changed) {
        id3Payload.tracknumber = ptv.mod.trackI.new;
        thisPatch.trackI = parseInt(ptv.mod.trackI.new);
      }

      if (ptv.mod.comments.changed) {
        thisPatch.comments = ptv.mod.comments.new;
      }

      if (ptv.mod.composer.changed) {
        id3Payload.composer = ptv.mod.composer.new;
        thisPatch.composer = ptv.mod.composer.new;
      }

      if (ptv.mod.grouping.changed) {
        thisPatch.grouping = ptv.mod.grouping.new;
      }

      patch.push(thisPatch);

      if (Object.keys(id3Payload).length > 0) {
        new RetagOp(ptv.id, id3Payload);
      }
    }
  }

  await updateTracks(patch);
  trackSettings.touch();
}
</script>

<style lang="scss" global>
@use '../../assets/colors';

#this-that {
  form {
    width: 100%;

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;

      thead {
        th {
          padding-bottom: 1rem;
          font-weight: normal;
          white-space: nowrap;

          label {
            display: block;
            margin-bottom: 5px;
          }
        }
      }

      td,
      th {
        padding: 0 8px;
        vertical-align: middle;
        text-align: left;
      }

      tbody {
        tr {
          td {
            padding-top: 1px;
            padding-bottom: 1px;

            &.new {
              padding-bottom: 1rem;
              color: white;

              &.changed {
                color: colors.$highlight;
              }
            }
          }
        }
      }
    }

    button[type='submit'] {
      margin: 0.5rem auto 0 auto;
    }
  }
}
</style>
