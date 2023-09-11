<div id="albums-container">
  <Tab
    tabTitle="Albums"
    tabId="albums"
    onMountFn="{() => {
      albumSettings.set(new AlbumSettings());
    }}"
    getNextResultsBatch="{() => getNextAlbumResultsBatch()}"
    bind:settings="{$albumSettings}"
    results="{$albumResults}"
    fields="{albumFields}"
    rowComponent="{AlbumRow}" />
</div>

<script lang="ts">
import { onDestroy, tick } from 'svelte';
import {
  albumFields,
  albumResults,
  AlbumSettings,
  albumSettings,
  getNextAlbumResultsBatch,
  statsContent,
} from '../../internal';
import Tab from '../Tab.svelte';
import AlbumRow from './AlbumRow.svelte';

$: {
  statsContent.set($albumResults?.statsContent ?? '');
}

onDestroy((): void => {
  setTimeout((): void => {
    void (async (): Promise<void> => {
      await tick();
      albumSettings.set(undefined);
    })();
  });
});
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#albums-container > table.tab {
  td,
  th {
    min-width: 5em;

    &.genre {
      width: 10em;
    }

    &.year {
      width: 4em;
    }

    &.created-at {
      width: 8em;
    }

    &.n-tracks {
      width: 5.5em;
    }

    &.total-duration {
      width: 6em;
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    tbody tr td {
      padding: 0;

      .fields {
        padding: 5px 0;
      }

      .actions {
        a {
          padding: 10px;
          display: flex;
          color: colors.$gray-text;
        }
      }
    }
  }
}
</style>
