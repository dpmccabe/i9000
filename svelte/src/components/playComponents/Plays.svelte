<div id="plays-container">
  <Tab
    tabTitle="Plays"
    tabId="plays"
    onMountFn="{() => {
      playSettings.set(new PlaySettings());
    }}"
    getNextResultsBatch="{() => getNextPlayResultsBatch()}"
    bind:settings="{$playSettings}"
    results="{$playResults}"
    fields="{playFields}"
    rowComponent="{PlayRow}" />
</div>

<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import {
    playFields,
    playResults,
    PlaySettings,
    playSettings,
    getNextPlayResultsBatch,
    statsContent,
  } from '../../internal';
  import Tab from '../Tab.svelte';
  import PlayRow from './PlayRow.svelte';

  $: {
    statsContent.set($playResults?.statsContent ?? '');
  }

  onDestroy((): void => {
    setTimeout((): void => {
      void (async (): Promise<void> => {
        await tick();
        playSettings.set(undefined);
      })();
    });
  });
</script>

<style lang="scss" global>
  @use '../../assets/colors';
  @use '../../assets/dims';

  #plays-container {
    table.tab {
      td,
      th {
        &.track-id {
          width: 27em;
        }

        &.track-cached {
          width: 2em;
        }

        &.track-rating {
          width: 5em;
        }

        &.track-genre {
          width: 9.5em;
        }

        &.track-track {
          width: 6em;
          text-align: center;
        }

        &.track-compilation {
          width: 8em;
          text-align: center;
        }

        &.track-disc {
          width: 4.5em;
          text-align: center;
        }

        &.track-rating {
          width: 5em;
          text-align: center;
        }

        &.track-year {
          width: 4.5em;
          text-align: center;
        }

        &.track-n-plays {
          width: 8em;
        }

        &.track-file-size {
          width: 7em;
        }

        &.track-duration {
          width: 5.5em;
        }

        &.track-bitrate {
          width: 5.5em;
        }

        &.track-start-at,
        &.track-stop-at {
          width: 5.5em;
        }

        &.track-created-at,
        &.track-updated-at,
        &.track-last-played,
        &.dt {
          width: 13.5em;
        }

        &.delete {
          text-align: right;
          width: 4em;

          a {
            color: colors.$gray-text;

            &:hover {
              color: white;
            }
          }
        }
      }

      td {
        &.track-track,
        &.track-disc {
          white-space: nowrap;
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
              display: flex;
              padding: 10px;
              color: colors.$gray-text;
            }
          }
        }
      }
    }
  }
</style>
