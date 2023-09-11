<!-- eslint-disable @typescript-eslint/no-unsafe-argument -->
<!-- eslint-disable @typescript-eslint/no-unsafe-assignment -->
<!-- eslint-disable @typescript-eslint/no-unsafe-member-access -->
<!-- eslint-disable @typescript-eslint/no-unsafe-call -->
<!-- eslint-disable next-line no-self-assign -->
<!--svelte-ignore a11y-click-events-have-key-events-->
<div
  class="m-top-nav"
  on:click="{() => {
    activePane.set('playlist-selector');
  }}">
  <h2>{tabTitle}</h2>
  <p>{$statsContent}</p>
</div>

{#if settings !== undefined && results !== undefined}
  {#if $activePane === 'tab-filters'}
    <Filters bind:settings="{settings}" fields="{fields}" tabId="{tabId}" />
  {/if}

  {#if results.count === 0}
    <p class="no-tab-results">(no {tabId} found)</p>
  {:else}
    <table
      class="{[
        'tab',
        `n-results-digits-${1 + Math.floor(Math.log10(results.count + 1))}`,
      ].join(' ')}"
      id="{tabId}">
      {#if !$narrow}
        <thead>
          <tr
            id="tab-sorters"
            class="expanded"
            transition:slide="{{ duration: 100 }}">
            {#each Object.keys(fields) as field}
              {#if fields[field].displayed}
                <th
                  class="{thCssClass(field, settings.sortBy)}"
                  class:numeric="{fields[field].numeric}"
                  class:sortable="{fields[field].sortable}"
                  on:click="{() => {
                    if (fields[field].sortable) {
                      settings.sortBy = settings.reSort(field);
                    }
                  }}">
                  <span>{fields[field].displayName}</span>
                </th>
              {/if}
            {/each}
          </tr>
        </thead>
      {/if}

      <tbody id="tab-body">
        {#each results.results as row, rix}
          {#key [row, rix]}
            <svelte:component this="{rowComponent}" row="{row}" rix="{rix}" />
          {/key}
        {/each}
      </tbody>
    </table>

    {#if results.results.length < results.count}
      <p class="loading-more" bind:this="{loadingEl}">Loading&hellip;</p>
    {/if}
  {/if}
{/if}

<svelte:window on:keydown="{keyDown}" />

<script lang="ts">
import { onMount, tick } from 'svelte';
import { slide } from 'svelte/transition';
import type Component from 'svelte/types/compiler/compile/Component';
import {
  activePane,
  type Album,
  type AlbumSettings,
  camelToKebabCase,
  infiniteScroll,
  narrow,
  type Release,
  type ReleaseSettings,
  statsContent,
  type TabField,
  type TabResults,
  type TabSettings,
  type TabSort,
  type Track,
  type TrackSettings,
} from '../internal';
import Filters from './tabComponents/Filters.svelte';

export let tabTitle = '';
export let tabId: string;
export let onMountFn: undefined | (() => void) = undefined;
export let getNextResultsBatch: () => Promise<void>;
export let settings:
  | TabSettings<AlbumSettings | ReleaseSettings | TrackSettings>
  | undefined;
export let results: TabResults<Album | Release | Track> | undefined = undefined;
export let fields: Record<string, TabField>;
export let rowComponent: Component;
let loadingEl: HTMLElement;

$: {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (loadingEl) {
    void tick().then((): void => {
      infiniteScroll(loadingEl, (): void => {
        void (async (): Promise<void> => {
          await getNextResultsBatch();
        })();
      });
    });
  }
}

onMount((): void => {
  if (onMountFn != null) onMountFn();
});

function keyDown(ev: KeyboardEvent): void {
  if (ev.key === 'f' && document.activeElement?.tagName !== 'INPUT') {
    activePane.set('tab-filters');
    ev.preventDefault();
  }
}

function thCssClass(fieldName: string, sortBy: TabSort): string {
  return [
    camelToKebabCase(fieldName),
    fieldName === sortBy.col
      ? ['sorting', sortBy.asc ? 'asc' : 'desc'].join(' ')
      : '',
  ].join(' ');
}
</script>

<style lang="scss" global>
@use '../assets/colors';
@use '../assets/dims';

table.tab {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;

  &.full-width {
    min-width: 100%;
    width: auto;
    table-layout: auto;

    td,
    th {
      width: auto !important;
      white-space: nowrap;
    }
  }

  &:focus {
    outline: none;
  }

  td,
  th {
    padding-left: 3px;
    padding-right: 3px;
    vertical-align: middle;
    text-align: left;
    font-size: 13px;

    &.numeric {
      text-align: right;
      font-variant: tabular-nums;
    }
  }

  thead {
    position: sticky;
    top: 0;

    tr {
      th {
        padding-top: 8px;
        padding-bottom: 8px;
        font-weight: normal;
        background-color: colors.$dark-gray;
        vertical-align: top;

        .m {
          display: none;
        }
      }

      &#tab-sorters {
        th {
          span {
            display: inline-block;
            border-top: transparent solid 1px;
            border-bottom: transparent solid 1px;
          }

          @media (hover: hover) {
            &.sortable:hover {
              color: white;
              cursor: pointer;
            }
          }

          &.sorting {
            color: colors.$highlight !important;

            &.asc span {
              border-bottom-color: colors.$highlight;
            }

            &.desc span {
              border-top-color: colors.$highlight;
            }
          }
        }
      }
    }
  }

  tbody {
    tr {
      background-color: colors.$med-gray;

      &:nth-of-type(2n) {
        background-color: colors.$dark-gray;
      }

      @media (hover: hover) and (min-width: dims.$mobile-cutoff) {
        &:hover {
          background-color: colors.$light-gray;
        }
      }

      &.none {
        td {
          text-align: center;
          font-style: italic;
        }
      }
    }

    td {
      padding-top: 1px;
      padding-bottom: 1px;
      cursor: default;
      -webkit-user-select: none;
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    display: flex;
    flex-direction: column;
    width: 100%;

    thead {
      display: none;
    }

    tbody {
      position: static;
      display: block;

      tr {
        display: flex;
        flex-direction: column;
        width: 100%;
        border-top: transparent solid 1px;

        &.expanded {
          background-color: colors.$light-gray;
        }

        td {
          text-align: left !important;
          width: 100% !important;
          padding: 10px 0;
          display: grid;
          grid-template-columns: 1fr min-content;
          grid-gap: 10px;

          .fields {
            dl {
              display: grid;
              grid-template-columns: 7.5em 1fr;
              column-gap: 10px;
              width: 100%;

              dt {
                text-align: right;
                font-weight: 700;
              }
            }
          }
        }
      }

      tr.expanded + tr.expanded {
        border-top-color: colors.$darkestest-gray;
      }
    }
  }
}

p.loading-more {
  padding: 10px;
  color: colors.$dim-text;
}

p.no-tab-results {
  margin: 15px;
  font-size: 13px;
  font-style: italic;
}
</style>
