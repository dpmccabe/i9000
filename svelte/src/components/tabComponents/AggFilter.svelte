<!-- eslint-disable @typescript-eslint/no-unsafe-assignment -->
<!-- eslint-disable @typescript-eslint/no-unsafe-argument -->
<!--svelte-ignore a11y-click-events-have-key-events-->
<div
  class="expandable-filter agg-filter"
  class:active="{$selectedValues.size > 0}"
  use:clickOutside="{() => {
    expanded = false;
  }}">
  <div class="filter-buttons">
    <a
      href="#top"
      role="button"
      class="filterer"
      on:click|preventDefault="{() => doAgg()}">
      <Fa icon="{faFilter}" fw size="lg" />

      {#if $selectedValues.size > 0}
        <span>{$selectedValues.size}</span>
      {/if}
    </a>

    {#if $selectedValues.size > 0}
      <a
        href="#top"
        role="button"
        class="clearer"
        on:click|preventDefault="{() => toggleAllNone('none')}">
        <Fa icon="{faEraser}" fw size="lg" />
      </a>
    {/if}
  </div>

  <div class="options" class:expanded="{expanded}">
    {#if expanded}
      {#if loading}
        <Fa icon="{faSpinner}" size="sm" spin />
      {:else}
        <TypingWaiter
          bind:focus="{focusTypingWaiter}"
          leftIcon="{faSearch}"
          waitTime="{0}"
          on:textUpdated="{(e) => {
            if (e.detail === '') {
              filterRegex.set(undefined);
            } else {
              filterRegex.set(new RegExp('\\b' + escapeRegExp(e.detail), 'i'));
            }
          }}" />

        {#if $nValsActive + $nValsInactive > 0}
          <div class="values">
            {#each normSort(Object.keys($valCountsIsActive.active)) as val}
              <a
                role="button"
                href="#top"
                class="active"
                on:click|preventDefault="{() => toggleValue(val)}">
                <span class="value">{val}</span>
                <span class="count">{$valCountsIsActive.active[val]}</span>
              </a>
            {/each}

            {#if $nValsInactive > 1 && $nValsInactive <= 100}
              <a
                href="#top"
                role="button"
                class="actions"
                on:click|preventDefault="{() => toggleAllNone('all')}"
                >Select all
                {$nValsInactive}</a>
            {/if}

            {#each normSort(Object.keys($valCountsIsActive.inactive)) as val, i}
              <a
                role="button"
                href="#top"
                class:sep-above="{i === 0}"
                on:click|preventDefault="{() => toggleValue(val)}">
                <span class="value">{val}</span>
                <span class="count">{$valCountsIsActive.inactive[val]}</span>
              </a>
            {/each}
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<svelte:window on:keydown="{keyDown}" />

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  faEraser,
  faFilter,
  faSearch,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { createEventDispatcher, onMount, tick } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import { type DispatchOptions } from 'svelte/internal';
import { clickOutside, escapeRegExp, narrow, normSort } from '../../internal';
import {
  derived,
  type Readable,
  type Writable,
  writable,
} from '../../lib/tansuStore';
import TypingWaiter from '../TypingWaiter.svelte';

const dispatch: <EventKey extends Extract<keyof any, string>>(
  type: EventKey,
  detail?: any,
  options?: DispatchOptions
) => boolean = createEventDispatcher();

export let initialSelectedValues: Set<string> = new Set<string>();
let expanded = false;
let loading = false;
let focusTypingWaiter: () => void;

const valCounts: Writable<Record<string, number>> = writable({});
const selectedValues: Writable<Set<string>> = writable(new Set());
const filterRegex: Writable<RegExp | undefined> = writable(undefined);

interface ValCountIsActive {
  active: Record<string, number>;
  inactive: Record<string, number>;
}

onMount((): void => {
  selectedValues.set(initialSelectedValues);
});

const valCountsIsActive: Readable<ValCountIsActive> = derived(
  [valCounts, filterRegex, selectedValues],
  ([theValCounts, theFilterRegex, theSelectedValues]: [
    Record<string, number>,
    RegExp | undefined,
    Set<string>
  ]): ValCountIsActive => {
    const newValCountsActive: Record<string, number> = {};
    const newValCountsInactive: Record<string, number> = {};

    for (const k of Object.keys(theValCounts)) {
      if (theSelectedValues.has(k)) {
        newValCountsActive[k] = theValCounts[k];
      } else if (theFilterRegex == undefined || theFilterRegex.test(k)) {
        newValCountsInactive[k] = theValCounts[k];
      }
    }

    return { active: newValCountsActive, inactive: newValCountsInactive };
  },
  { active: {}, inactive: {} }
);

const nValsActive: Readable<number> = derived(
  [valCountsIsActive],
  ([theValCountsIsActive]: [ValCountIsActive]): number => {
    return Object.keys(theValCountsIsActive.active).length;
  },
  0
);

const nValsInactive: Readable<number> = derived(
  [valCountsIsActive],
  ([theValCountsIsActive]: [ValCountIsActive]): number => {
    return Object.keys(theValCountsIsActive.inactive).length;
  },
  0
);

function doAgg(): void {
  if (expanded) {
    loading = false;
    expanded = false;
    return;
  }

  loading = true;
  expanded = true;
  filterRegex.set(undefined);

  dispatch('doAgg', {
    done: (newValCounts: Record<string, number>): void => {
      loading = false;
      valCounts.set(newValCounts);

      if (!$narrow) {
        void tick().then((): void => focusTypingWaiter());
      }
    },
  });
}

function toggleValue(val: string): void {
  const theSelectedValues: Set<string> = selectedValues.get();

  if (theSelectedValues.has(val)) {
    theSelectedValues.delete(val);
  } else {
    theSelectedValues.add(val);
  }

  dispatch('updateValues', {
    values: theSelectedValues,
    done: (): void => {
      selectedValues.set(theSelectedValues);
    },
  });
}

function toggleAllNone(which: 'all' | 'none'): void {
  let theSelectedValues: Set<string> = selectedValues.get();

  if (which === 'all') {
    if (nValsInactive.get() === 0) return;

    for (const val in valCountsIsActive.get().inactive) {
      theSelectedValues.add(val);
    }
  } else {
    theSelectedValues = new Set();
    expanded = false;
  }

  dispatch('updateValues', {
    values: theSelectedValues,
    done: (): void => {
      selectedValues.set(theSelectedValues);
    },
  });
}

function keyDown(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') expanded = false;
}
</script>
