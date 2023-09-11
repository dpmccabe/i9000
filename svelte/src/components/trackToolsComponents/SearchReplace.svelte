<Modal id="search-replace">
  <span slot="title">Replace text in {$nTracksSelected} track(s)</span>

  <div slot="content">
    <form on:submit|preventDefault="{() => doSearchReplace()}">
      <input
        id="sr-format"
        bind:this="{srRegexInput}"
        type="text"
        placeholder=".+"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        on:keyup="{extendTimeout}" />

      <input
        id="sr-replacement"
        bind:this="{srReplacementInput}"
        type="text"
        placeholder="replacement"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        on:keyup="{extendTimeout}" />

      <div class="radio-group">
        {#each srFields as col}
          <label
            ><input
              type="radio"
              bind:group="{$srFieldToUse}"
              value="{col}" />{col}</label>
        {/each}
      </div>

      <table>
        <thead>
          <tr>
            <th>Old {$srFieldToUse}</th>
            <th>New {$srFieldToUse}</th>
          </tr>
        </thead>

        <tbody>
          {#each $srTrackValues as v}
            <tr>
              <td class="old">{v.old}</td>
              <td class="new" class:changed="{v.changed}">{v.new}</td>
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
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { onDestroy, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  activePane,
  escapeRegExp,
  nTracksSelected,
  RetagOp,
  type SearchReplaceMod,
  selectedTracks,
  type Track,
  trackSettings,
  updateTracks,
} from '../../internal';
import {
  derived,
  type Readable,
  type Writable,
  writable,
} from '../../lib/tansuStore';
import Modal from '../modalComponents/Modal.svelte';

let srRegexInput: HTMLInputElement;
let srReplacementInput: HTMLInputElement;
let typingWaiter: number | null = null;
let working = false;

onMount((): void => {
  srRegexInput.focus();
});

onDestroy((): void => {
  working = false;
});

function extendTimeout(): void {
  if (typingWaiter != null) window.clearTimeout(typingWaiter);
  typingWaiter = window.setTimeout(previewReplace, 1000);
}

function previewReplace(): void {
  srRegex.set(srRegexInput.value);
  srReplacement.set(srReplacementInput.value);
}

async function doSearchReplace(): Promise<void> {
  if (working) return;

  working = true;
  srRegex.set(srRegexInput.value);
  srReplacement.set(srReplacementInput.value);

  await updateTagsFromSearchReplace();

  activePane.set('tracks');
  document.getElementById('tracks')?.focus();
}

const srRegex: Writable<string> = writable('');
const srReplacement: Writable<string> = writable('');
type srFieldOption = 'title' | 'artist' | 'album';
const srFields: string[] = ['title', 'artist', 'album'];
const srFieldToUse: Writable<srFieldOption> = writable('title');

const srTrackValues: Readable<SearchReplaceMod[]> = derived(
  [selectedTracks, srRegex, srReplacement, srFieldToUse],
  ([theSelectedTracks, theSrRegex, theSrReplacement, theSrFieldToUse]: [
    Track[],
    string,
    string,
    srFieldOption
  ]): SearchReplaceMod[] => {
    let reg: RegExp | null;

    if (theSrRegex.length > 0) {
      try {
        reg = new RegExp(escapeRegExp(theSrRegex), 'g');
      } catch (e: unknown) {
        console.log(e);
      }
    }

    return theSelectedTracks.map((t: Track): SearchReplaceMod => {
      let replaceValue: string = t[theSrFieldToUse] ?? '';

      if (reg != null) {
        replaceValue = t[theSrFieldToUse]!.replaceAll(reg, theSrReplacement);
      }

      return {
        id: t.id!,
        old: t[theSrFieldToUse] ?? '',
        new: replaceValue,
        changed: t[theSrFieldToUse] !== replaceValue,
      };
    });
  },
  []
);

async function updateTagsFromSearchReplace(): Promise<void> {
  if (nTracksSelected.get() === 0) return;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const patch: Record<string, any>[] = [];
  const field: string = srFieldToUse.get()!;

  for (const ptv of srTrackValues.get()) {
    if (ptv.changed) {
      patch.push({
        id: ptv.id,
        updatedAt: DateTime.now().toMillis(),
        [field]: ptv.new,
      });
      new RetagOp(ptv.id, { [field]: ptv.new });
    }
  }

  await updateTracks(patch);
  trackSettings.touch();
}
</script>

<style lang="scss" global>
@use '../../assets/colors';

#search-replace {
  min-width: 500px;

  form {
    width: 100%;

    input#sr-format {
      width: 100%;
    }

    input#sr-replacement {
      margin-top: 5px;
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
      margin: 1.5rem auto 0 auto;
    }
  }
}
</style>
