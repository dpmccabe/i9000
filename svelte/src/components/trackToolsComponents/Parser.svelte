<Modal id="parser">
  <span slot="title">Parsing {$nTracksSelected} track(s)</span>

  <div slot="content">
    <form on:submit|preventDefault="{() => doParse()}">
      <table>
        <thead>
          <tr>
            <th>Source tag</th>
            <th>Parse format</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              <select bind:value="{$sourceTag}">
                <option value="title" selected>Title</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="comments">Comments</option>
              </select>
            </td>

            <td>
              <input
                id="parse-format"
                bind:this="{parseFormatInput}"
                type="text"
                placeholder="parse format"
                autocapitalize="off"
                autocomplete="off"
                spellcheck="false"
                on:keyup="{extendTimeout}" />
            </td>
          </tr>
        </tbody>
      </table>

      <table>
        <thead>
          <tr>
            {#each Object.keys(parsableFields) as col}
              <th>
                {availableCols[col].displayName}
                -
                <span class="less-imp"> {parsableFields[col]}</span>
              </th>
            {/each}
          </tr>
        </thead>

        <tbody>
          {#each $parsedTrackValues as v}
            <tr>
              {#each Object.keys(parsableFields) as col}
                <td>
                  {#if v.mod[col].old === ''}
                    &varnothing;
                  {:else}{v.mod[col].old}{/if}
                </td>
              {/each}
            </tr>

            <tr>
              {#each Object.keys(parsableFields) as col}
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
        ><span>Update</span>
        <Fa icon="{faSpinner}" size="sm" spin /></button>
    </form>
  </div>
</Modal>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */

import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { onDestroy, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  activePane,
  availableCols,
  nTracksSelected,
  RetagOp,
  selectedTracks,
  type Track,
  trackSettings,
  type TrackParseMod,
  updateTracks,
  trimWithin,
} from '../../internal';
import {
  derived,
  type Readable,
  type Writable,
  writable,
} from '../../lib/tansuStore';
import Modal from '../modalComponents/Modal.svelte';

const parsableFields: Record<string, string> = {
  title: '%t',
  artist: '%a',
  album: '%l',
  track: '%i',
  disc: '%d',
  comments: '%c',
};

let parseFormatInput: HTMLInputElement;
let typingWaiter: number | null = null;
let working = false;

onMount((): void => {
  parseFormatInput.focus();
});

onDestroy((): void => {
  working = false;
});

function extendTimeout(): void {
  if (typingWaiter != null) window.clearTimeout(typingWaiter);
  typingWaiter = window.setTimeout(previewParsing, 1000);
}

function previewParsing(): void {
  parseFormat.set(parseFormatInput.value);
}

async function doParse(): Promise<void> {
  if (working) return;

  working = true;
  parseFormat.set(parseFormatInput.value);

  await updateTagsFromParsed();

  activePane.set('tracks');
  document.getElementById('tracks')?.focus();
}

type AvailableSourceTag = 'title' | 'artist' | 'album' | 'comments';
const sourceTag: Writable<AvailableSourceTag> = writable('title');
const parseFormat: Writable<string> = writable('');

const parsedTrackValues: Readable<TrackParseMod[]> = derived(
  [selectedTracks, sourceTag, parseFormat],
  ([theSelectedTracks, theSourceTag, theParseFormat]: [
    Track[],
    AvailableSourceTag,
    string | null
  ]): TrackParseMod[] => {
    if (theParseFormat == null) return [];

    const parts: string[] = [];
    let curPart = '';

    for (const part of theParseFormat) {
      if (part === '%') {
        if (curPart.length > 0) {
          // put previous separator on stack
          parts.push(curPart);
        }

        curPart = '%';
      } else if (curPart === '%') {
        // in a token, so which letter?
        curPart += part;
        parts.push(curPart);
        curPart = '';
      } else {
        // some character that's part of a separator being build
        curPart += part;
      }
    }

    if (curPart.length > 0) {
      parts.push(curPart);
    }

    return theSelectedTracks.map((t: Track): TrackParseMod => {
      const parsedTrack: Record<string, string> = parseTrack(
        t,
        theSourceTag,
        parts
      );

      const tpm: TrackParseMod = {
        id: t.id!,
        mod: {
          title: {
            old: t.title ?? '',
            new: parsedTrack.title || (t.title ?? ''),
            changed: 'title' in parsedTrack,
          },
          artist: {
            old: t.artist ?? '',
            new: parsedTrack.artist || (t.artist ?? ''),
            changed: 'artist' in parsedTrack,
          },
          album: {
            old: t.album ?? '',
            new: parsedTrack.album || (t.album ?? ''),
            changed: 'album' in parsedTrack,
          },
          track: {
            old: (t.trackI ?? '').toString(),
            new: parsedTrack.track || (t.trackI ?? '').toString(),
            changed: 'track' in parsedTrack,
          },
          disc: {
            old: (t.discI ?? '').toString(),
            new: parsedTrack.disc || (t.discI ?? '').toString(),
            changed: 'disc' in parsedTrack,
          },
          comments: {
            old: t.comments ?? '',
            new: parsedTrack.comments || (t.comments ?? ''),
            changed: 'comments' in parsedTrack,
          },
        },
      };

      tpm.anyChanged =
        tpm.mod.title.changed ||
        tpm.mod.artist.changed ||
        tpm.mod.album.changed ||
        tpm.mod.track.changed ||
        tpm.mod.disc.changed ||
        tpm.mod.comments.changed;

      return tpm;
    });
  },
  []
);

function parseTrack(
  track: Track,
  theSourceTag: AvailableSourceTag,
  parts: string[]
): Record<string, string> {
  let sourceValue: string = trimWithin(track[theSourceTag] ?? '');
  const partsToDo: string[] = [...parts];
  let curExtraction: string | null = null;
  let curSep: string | null = null;
  let sepPos: number | null = null;
  let mod: Record<string, string> = {};

  while (sourceValue.length > 0 && partsToDo.length > 0) {
    curExtraction = partsToDo.shift()!;

    if (curExtraction.startsWith('%')) {
      // extracting a token, which is either followed by a sep or at the end
      curSep = partsToDo.shift()!;

      if (curSep == null) {
        // this token is final part of entered parse format, so extract through
        // the end of the title
        curSep = '';
        sepPos = sourceValue.length;
      } else {
        // where does this token end and the sep begin for this title?
        sepPos = sourceValue.indexOf(curSep);
      }

      if (sepPos >= 1) {
        // there is something to extract
        switch (curExtraction[1]) {
          case 't':
            mod.title = sourceValue.substring(0, sepPos);
            break;
          case 'a':
            mod.artist = sourceValue.substring(0, sepPos);
            break;
          case 'l':
            mod.album = sourceValue.substring(0, sepPos);
            break;
          case 'i':
            mod.track = sourceValue.substring(0, sepPos);
            break;
          case 'd':
            mod.disc = sourceValue.substring(0, sepPos);
            break;
          case 'c':
            mod.comments = sourceValue.substring(0, sepPos);
            break;
        }

        sourceValue = sourceValue.substring(sepPos + curSep.length);
      } else {
        // bail, this title doesn't match the parse format
        mod = {};
        break;
      }
    } else {
      // we're at the beginning, which starts with a separator
      curSep = curExtraction;
      sepPos = sourceValue.indexOf(curSep);

      if (sepPos >= 0) {
        sourceValue = sourceValue.substring(sepPos + curSep.length);
      } else {
        // bail, this title doesn't match the parse format
        mod = {};
        break;
      }
    }
  }

  return mod;
}

async function updateTagsFromParsed(): Promise<void> {
  if ($nTracksSelected === 0) return;

  const patch: Record<string, any>[] = [];

  for (const ptv of $parsedTrackValues) {
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

      if (ptv.mod.artist.changed) {
        id3Payload.artist = ptv.mod.artist.new;
        thisPatch.artist = ptv.mod.artist.new;
      }

      if (ptv.mod.album.changed) {
        id3Payload.album = ptv.mod.album.new;
        thisPatch.album = ptv.mod.album.new;
      }

      if (ptv.mod.track.changed) {
        id3Payload.tracknumber = ptv.mod.track.new;
        thisPatch.trackI = parseInt(ptv.mod.track.new);
      }

      if (ptv.mod.disc.changed) {
        id3Payload.discnumber = ptv.mod.disc.new;
        thisPatch.discI = parseInt(ptv.mod.disc.new);
      }

      if (ptv.mod.comments.changed) {
        thisPatch.comments = ptv.mod.comments.new;
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

#parser {
  width: 1200px;

  form {
    width: 100%;

    input#parse-format {
      width: 100%;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;

      thead {
        th {
          padding-bottom: 8px;
          font-weight: normal;
          white-space: nowrap;
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

    table + table {
      margin-top: 1.5rem;
    }

    button[type='submit'] {
      margin: 0.5rem auto 0 auto;
    }
  }
}
</style>
