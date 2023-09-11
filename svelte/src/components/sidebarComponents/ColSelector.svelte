<Modal id="col-selector">
  <span slot="title">Columns</span>

  <div slot="content">
    <form>
      {#if $tabSettings !== undefined}
        {#each Object.keys($tabSettings.tabFields) as fieldName}
          <label for="show-{fieldName}">
            <input
              id="show-{fieldName}"
              type="checkbox"
              value="{fieldName}"
              checked="{$tabSettings.tabFields[fieldName].displayed}"
              on:click="{() => {
                $tabSettings.tabFields[fieldName].displayed =
                  !$tabSettings.tabFields[fieldName].displayed;
              }}" />

            <span>{$tabSettings.tabFields[fieldName].displayName}</span>
          </label>

          <span
            class="col-sorts"
            class:disabled="{!$tabSettings.tabFields[fieldName].displayed}">
            {#if $tabSettings.tabFields[fieldName].sortable}
              <button
                disabled="{!$tabSettings.tabFields[fieldName].displayed}"
                class:sorting="{$tabSettings.sortBy.col === fieldName &&
                  $tabSettings.sortBy.asc}"
                on:click|preventDefault="{() => {
                  $tabSettings.sortBy = $tabSettings.reSort(fieldName, true);
                }}">asc</button>
              |
              <button
                disabled="{!$tabSettings.tabFields[fieldName].displayed}"
                class:sorting="{$tabSettings.sortBy.col === fieldName &&
                  !$tabSettings.sortBy.asc}"
                on:click|preventDefault="{() => {
                  $tabSettings.sortBy = $tabSettings.reSort(fieldName, false);
                }}">desc</button>
            {/if}
          </span>
        {/each}
      {/if}
    </form>
  </div>
</Modal>

<script lang="ts">
import {
  albumSettings,
  type AlbumSettings,
  type ReleaseSettings,
  releaseSettings,
  type TrackSettings,
  trackSettings,
  view,
} from '../../internal';
import { type Writable } from '../../lib/tansuStore';
import Modal from '../modalComponents/Modal.svelte';

export let tabSettings: Writable<
  AlbumSettings | ReleaseSettings | TrackSettings | undefined
>;

$: if ($view === 'albums') {
  tabSettings = albumSettings;
} else if ($view === 'releases') {
  tabSettings = releaseSettings;
} else if ($view === 'tracks') {
  tabSettings = trackSettings;
}
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#col-selector {
  h2 {
    margin-bottom: 0.5rem;
  }

  form {
    display: grid;
    grid-template-columns: min-content min-content;
    grid-column-gap: 15px;
    grid-row-gap: 5px;
    align-items: center;
    font-size: 13px;

    & > label,
    & > span {
      white-space: nowrap;
    }

    & > span {
      text-align: right;

      &.disabled {
        opacity: 0.25;
      }

      button {
        background: none;
        border: none;
        padding: 0;
        color: colors.$gray-text;

        &:enabled {
          cursor: pointer;
        }

        @media (hover: hover) {
          &:enabled:hover {
            color: white;
          }
        }

        &.sorting {
          color: colors.$highlight;
        }
      }
    }

    @media screen and (max-width: dims.$mobile-cutoff) {
      grid-template-columns: auto auto;

      & > span {
        button {
          padding: 5px 15px;
        }
      }
    }
  }
}
</style>
