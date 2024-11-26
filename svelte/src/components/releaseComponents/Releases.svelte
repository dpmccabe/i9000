<div id="releases-container">
  <Tab
    tabTitle="Releases"
    tabId="releases"
    onMountFn="{() => {
      releaseSettings.set(new ReleaseSettings());
    }}"
    getNextResultsBatch="{() => getNextReleaseResultsBatch()}"
    bind:settings="{$releaseSettings}"
    results="{$releaseResults}"
    fields="{releaseFields}"
    rowComponent="{ReleaseRow}" />
</div>

<script lang="ts">
import { onDestroy, onMount, tick } from 'svelte';
import {
  getNextReleaseResultsBatch,
  releaseFields,
  releaseResults,
  ReleaseSettings,
  releaseSettings,
  nNewReleases,
  getNNewReleases,
  statsContent,
} from '../../internal';
import Tab from '../Tab.svelte';
import ReleaseRow from './ReleaseRow.svelte';

$: {
  statsContent.set($releaseResults?.statsContent ?? '');
}

onMount(async (): Promise<void> => {
  nNewReleases.set(await getNNewReleases());
});

onDestroy((): void => {
  setTimeout((): void => {
    void (async (): Promise<void> => {
      await tick();
      releaseSettings.set(undefined);
    })();
  });
});
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#releases-container > table.tab {
  td,
  th {
    min-width: 5em;

    &.ackstate {
      width: 9em;
    }

    &.types {
      width: 17em;
    }

    &.release-date,
    &.created-at {
      width: 8em;
    }
  }

  td {
    .ackstate {
      display: flex;
      flex-direction: row;

      a {
        color: colors.$gray-text;
        padding: 5px;
        font-size: 11px;

        @media (hover: hover) {
          &:hover {
            color: white;
          }
        }
      }

      &.new a.new {
        color: colors.$highlight;
      }

      &.todo a.todo {
        color: colors.$yellow-star;
      }

      &.acked a.acked {
        color: #8bc34a;
      }
    }

    .types {
      span {
        white-space: nowrap;
        display: inline-block;
        padding: 0 5px;
        margin-right: 5px;
        background-color: #999;
        color: colors.$dark-gray;
        border-radius: 5px;

        @for $i from 1 through length(colors.$release-types) {
          &.#{nth(colors.$release-types, $i)} {
            background-color: #{nth(colors.$release-type-colors, $i)};
          }
        }
      }
    }

    a:not([role='button']) {
      color: colors.$gray-text;
      text-decoration: none;

      @media (hover: hover) {
        &:hover {
          color: white;
        }
      }

      &.lastfm {
        color: #fbb4ae;
        display: inline-block;
        margin: 0 2px;

        @media (hover: hover) {
          &:hover {
            color: white;
          }
        }
      }

      &.copy {
        display: inline-block;
        margin: 0 2px;

        @media (hover: hover) {
          &:hover {
            color: white;
          }
        }
      }
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    tbody tr td .actions {
      padding: 10px;
    }
  }
}
</style>
