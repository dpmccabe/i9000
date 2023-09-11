<!--svelte-ignore a11y-click-events-have-key-events-->
<div
  class="expandable-filter range-filter"
  class:active="{$range != null}"
  use:clickOutside="{() => {
    expanded = false;
  }}">
  <div class="filter-buttons">
    <a
      href="#top"
      role="button"
      class="filterer"
      on:click|preventDefault="{() => loadRange()}">
      <Fa icon="{faArrowsLeftRightToLine}" fw size="lg" />
    </a>

    {#if $range != null}
      <a
        href="#top"
        role="button"
        class="clearer"
        on:click|preventDefault|stopPropagation="{() => {
          updateRange(undefined);
        }}">
        <Fa icon="{faEraser}" fw size="lg" />
      </a>
    {/if}
  </div>

  <div class="options" class:expanded="{expanded}">
    {#if expanded}
      {#if loading}
        <Fa icon="{faSpinner}" size="sm" spin />
      {/if}
      <div bind:this="{sliderContainer}"></div>
    {/if}
  </div>
</div>

<svelte:window on:keydown="{keyDown}" />

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  faArrowsLeftRightToLine,
  faEraser,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';
import { createEventDispatcher, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import { type DispatchOptions } from 'svelte/internal';
import {
  clickOutside,
  formatDate,
  formatDuration,
  type NumberRange,
  type TabRangeType,
} from '../../internal';
import { writable, type Writable } from '../../lib/tansuStore';

export let rangeType: TabRangeType;

const dispatch: <EventKey extends Extract<keyof any, string>>(
  type: EventKey,
  detail?: any,
  options?: DispatchOptions
) => boolean = createEventDispatcher();

export let initialRange: NumberRange | undefined;
let expanded = false;
let loading = false;
let sliderContainer: HTMLDivElement;

const availableRange: Writable<NumberRange | undefined> = writable(undefined);
const range: Writable<NumberRange | undefined> = writable(undefined);

onMount((): void => {
  range.set(initialRange);
});

function keyDown(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') expanded = false;
}

function loadRange(): void {
  if (expanded) {
    loading = false;
    expanded = false;
    return;
  }

  loading = true;
  expanded = true;

  dispatch('loadRange', {
    done: (percentiles: number[]): void => {
      loading = false;

      const nPerc: number = percentiles.length - 1;

      availableRange.set({
        min: percentiles[0],
        max: percentiles[nPerc],
      });

      let initialRange: [number, number] = [percentiles[0], percentiles[nPerc]];

      if ($range !== undefined) {
        initialRange = [$range.min, $range.max];
      }

      const sliderRange: Record<string, number[]> = Object.fromEntries(
        percentiles.map((p: number, i: number): [string, number[]] => {
          let k: string;

          if (i === 0) {
            k = 'min';
          } else if (i === nPerc) {
            k = 'max';
          } else {
            k = `${(i / nPerc) * 100}%`;
          }

          return [k, [p]];
        })
      );

      if (!('max' in sliderRange)) sliderRange.max = sliderRange.min;

      // eslint-disable-next-line import/no-named-as-default-member
      noUiSlider.create(sliderContainer, {
        range: sliderRange,
        connect: true,
        orientation: 'vertical',
        start: initialRange,
        behaviour: 'tap',
        format: {
          to: toFormatter,
          from: fromFormatter,
        },
        pips: {
          mode: 'range',
          density: 10,
          format: {
            to: toFormatter,
            from: fromFormatter,
          },
        },
        tooltips: true,
      });

      // eslint-disable-next-line
      sliderContainer.noUiSlider.on(
        'change',
        (
          values: [string, string],
          handle: number,
          unencoded: [number, number]
        ): void => {
          const min: number = Math.round(unencoded[0]);
          const max: number = Math.round(unencoded[1]);
          let newRange: NumberRange | undefined;

          if (min === $availableRange.min! && max === $availableRange.max!) {
            newRange = undefined;
          } else {
            newRange = { min: min, max: max };
          }

          updateRange(newRange);
        }
      );
    },
  });
}

function toFormatter(value: number): string {
  if (rangeType === 'int') {
    return Math.round(value).toString();
  } else if (rangeType === 'date' || rangeType === 'datetime') {
    return formatDate(
      DateTime.fromMillis(value, {
        zone: 'UTC',
      })
    );
  } else if (rangeType === 'duration') {
    return formatDuration(value);
  }
}

function fromFormatter(value: string): number {
  return parseInt(value);
}

function updateRange(newRange: NumberRange | undefined): void {
  if (newRange !== $range) {
    range.set(newRange);
    dispatch('updateRange', newRange);

    if (newRange === undefined) expanded = false;
  }
}
</script>
