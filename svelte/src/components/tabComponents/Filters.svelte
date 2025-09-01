<!--svelte-ignore a11y-label-has-associated-control-->
<Modal id="tab-filters">
  <span slot="title">Filters</span>

  <div slot="content" class="content">
    <div id="tab-filters-grid" class="{tabId}">
      {#if Object.values(fields).some((f) => f.globallySearchable)}
        <label></label>
        <div class="global">
          <TypingWaiter
            leftIcon="{faSearch}"
            waitTime="{200}"
            text="{settings.filters.get('global')?.text}"
            on:textUpdated="{(e) => {
              if (e.detail === '') {
                settings.filters.delete('global');
              } else {
                settings.filters.set('global', { text: e.detail });
              }

              // eslint-disable-next-line no-self-assign
              settings.filters = settings.filters;
            }}" />
        </div>
      {/if}

      {#each Object.keys(fields) as field}
        {#if fields[field].aggregatable || fields[field].filterType != null}
          <label>{fields[field].displayName}</label>

          <div class="{camelToKebabCase(field)}">
            {#if fields[field].aggregatable}
              <AggFilter
                initialSelectedValues="{settings.filters.get(field)?.values}"
                on:doAgg="{async (e) =>
                  await getAgg(e, field, fields[field].aggregateFlat)}"
                on:updateValues="{(e) => updateAggFilterValues(e, field)}" />
            {:else if fields[field].filterType === 'text'}
              <TypingWaiter
                leftIcon="{faSearch}"
                waitTime="{200}"
                text="{settings.filters.get(field)?.text}"
                on:textUpdated="{(e) => {
                  if (e.detail === '') {
                    settings.filters.delete(field);
                  } else {
                    settings.filters.set(field, { text: e.detail });
                  }

                  // eslint-disable-next-line no-self-assign
                  settings.filters = settings.filters;
                }}" />
            {:else if fields[field].filterType === 'range'}
              <RangeFilter
                rangeType="{fields[field].rangeType}"
                initialRange="{settings.filters.get(field)}"
                on:loadRange="{async (e) => {
                  e.detail.done(
                    await settings.getPercentiles(
                      field,
                      fields[field].rangeType
                    )
                  );
                }}"
                on:updateRange="{(e) => {
                  if (e.detail == null) {
                    settings.filters.delete(field);
                  } else {
                    settings.filters.set(field, e.detail);
                  }

                  // eslint-disable-next-line no-self-assign
                  settings.filters = settings.filters;
                }}" />
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </div>
</Modal>

<script lang="ts">
/*
  eslint-disable
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access
*/

import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { onMount } from 'svelte';
import {
  type AlbumSettings,
  camelToKebabCase,
  type ReleaseSettings,
  type RelationshipSettings,
  type TabField,
  type TabSettings,
  type TrackSettings,
} from '../../internal';
import Modal from '../modalComponents/Modal.svelte';
import TypingWaiter from '../TypingWaiter.svelte';
import AggFilter from './AggFilter.svelte';
import RangeFilter from './RangeFilter.svelte';

export let settings: TabSettings<
  AlbumSettings | ReleaseSettings | RelationshipSettings | TrackSettings
>;
export let fields: Record<string, TabField>;
export let tabId: string;

onMount((): void => {
  (
    document.querySelector(
      '#tab-filters-grid input, #tab-filters-grid select'
    ) as HTMLElement
  )?.focus();
});

async function getAgg(
  e: CustomEvent,
  field: string,
  aggregateFlat: boolean
): Promise<void> {
  e.detail.done(await settings.getAgg(field, aggregateFlat));
}

function updateAggFilterValues(e: CustomEvent, field: string): void {
  const values: Set<string> = e.detail.values as Set<string>;

  if (values.size === 0) {
    settings.filters.delete(field);
  } else {
    settings.filters.set(field, { values: values });
  }

  // eslint-disable-next-line no-self-assign
  settings.filters = settings.filters;
  e.detail.done();
}
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#tab-filters .content {
  overflow-x: hidden;
}

#tab-filters-grid {
  display: grid;
  grid-template-columns: min-content auto;
  row-gap: 10px;
  width: 50em;

  label {
    display: block;
    text-align: right;
    margin-right: 15px;
    line-height: 30px;
    white-space: nowrap;
  }

  .expandable-filter {
    background-color: colors.$dark-gray;
    position: relative;
    display: flex;
    flex-direction: column;

    .filter-buttons {
      background-color: colors.$light-gray;
      color: colors.$dim-text;
      border-radius: 5px;
      height: 30px;
      display: grid;
      grid-template-columns: auto min-content;

      a {
        padding: 0 5px;
        display: flex;
        width: 100%;
        align-items: center;
        text-decoration: none;
        color: colors.$dim-text;

        &:hover {
          color: white;
        }

        span {
          background-color: colors.$highlight;
          color: colors.$light-gray;
          height: 15px;
          border-radius: 15px;
          line-height: 15px;
          font-size: 11px;
          text-align: center;
          padding: 0 5px;
        }
      }
    }

    .options {
      display: none;
      height: auto;
      max-height: 300px;
      overflow-y: auto;
      padding: 15px 30px 0 30px;
      margin-bottom: 15px;

      &.expanded {
        display: block;
      }
    }

    &.active {
      .filter-buttons a.filterer {
        color: colors.$highlight;
      }
    }

    &.agg-filter {
      .options {
        font-size: 13px;

        .typing-waiter {
          margin-bottom: 10px;

          input[type='text'] {
            height: 30px;
            line-height: 30px;
          }

          svg.svelte-fa + input[type='text'] {
            padding-left: 20px;
          }
        }

        .values {
          margin-top: 10px;

          a {
            color: colors.$gray-text;
            width: 100%;
            display: flex;
            text-decoration: none;
            flex-direction: row;
            justify-content: space-between;
            margin: 0;
            padding: 5px;
            column-gap: 5px;

            &:nth-of-type(2n) {
              background-color: colors.$darkest-gray;
            }

            &.active {
              color: colors.$highlight;
            }

            @media (hover: hover) {
              &:hover {
                color: white;
              }
            }

            span {
              line-height: 1.2;

              &.count {
                text-align: right;
                font-variant: tabular-nums;
              }
            }
          }

          a + a.sep-above {
            border-top: solid colors.$bright-gray 1px;
          }
        }
      }
    }

    &.range-filter {
      .noUi-vertical.noUi-target {
        height: 200px;
        margin: 7.5px 0 7.5px auto;
        width: 10px;
        border-radius: 10px;
        box-shadow: none;
        border: none;
        background-color: colors.$highlight-darkest;
      }

      .noUi-connect {
        background: colors.$highlight-less-darker;
        border-radius: 10px;
      }

      .noUi-vertical .noUi-draggable {
        cursor: default;
      }

      .noUi-handle {
        height: 15px !important;
        width: 15px !important;
        right: -2.5px !important;
        bottom: -7.5px !important;
        border-radius: 15px;
        box-shadow: none;
        border: none;

        &::before,
        &::after {
          content: unset;
        }
      }

      .noUi-tooltip {
        background-color: colors.$dark-gray;
        border-radius: 5px;
        border: none;
        color: white;
        padding: 2.5px 5px;
        right: 35px !important;
      }

      .noUi-pips.noUi-pips-vertical {
        left: unset;
        right: 100%;

        .noUi-marker-vertical.noUi-marker {
          right: 7.5px;

          &.noUi-marker-large {
            width: 12.5px;
          }
        }

        .noUi-value {
          text-align: right;
          padding-left: unset;
          right: 25px;
          font-size: 10px;
        }
      }
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    width: 100% !important;

    & > div {
      .expandable-filter {
        .options {
          a {
            padding: 10px !important;
          }
        }
      }
    }
  }
}
</style>
