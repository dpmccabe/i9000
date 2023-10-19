<div
  id="tracks-container"
  class="{$extraTableClasses.join(' ')}"
  on:mouseleave="{removeDragClass}">
  <Tab
    tabTitle="{$currentPlaylist?.name ?? 'Playlists'}"
    tabId="tracks"
    getNextResultsBatch="{() => getNextTrackResultsBatch()}"
    bind:settings="{$trackSettings}"
    results="{$trackResults}"
    fields="{trackFields}"
    rowComponent="{TrackRow}" />
</div>

<script lang="ts">
import { onDestroy, tick } from 'svelte';
import {
  cutOrCopy,
  cutOrCopyFromPlaylistId,
  formatDuration,
  getNextTrackResultsBatch,
  type Playlist,
  removeDragClass,
  selectedTrackIds,
  statsContent,
  currentPlaylist,
  type Track,
  trackFields,
  trackResults,
  tracksAreReorderable,
  trackSettings,
} from '../../internal';
import { derived, type Readable } from '../../lib/tansuStore';
import Tab from '../Tab.svelte';
import TrackRow from './TrackRow.svelte';

$: {
  if ($selectedTrackIds.size > 1 && $trackResults !== undefined) {
    const selectedTracksDuration: number = $trackResults.results.reduce(
      (acc: number, t: Track): number => {
        if ($selectedTrackIds.has(t.id)) acc += t.duration!;
        return acc;
      },
      0
    );

    statsContent.set(
      [
        `${$selectedTrackIds.size} tracks`,
        formatDuration(selectedTracksDuration),
      ].join(', ')
    );
  } else {
    statsContent.set($trackResults?.statsContent ?? '');
  }
}

const extraTableClasses: Readable<string[]> = derived(
  [tracksAreReorderable, cutOrCopy, cutOrCopyFromPlaylistId, currentPlaylist],
  ([
    theTracksAreReorderable,
    theCutOrCopy,
    theCutOrCopyFromPlaylistId,
    theCurrentPlaylist,
  ]: [
    boolean,
    'cut' | 'copy' | null,
    number | null,
    Playlist | undefined
  ]): string[] => {
    const etc: string[] = [];

    if (theTracksAreReorderable) etc.push('reorderable');

    if (
      theCutOrCopy === 'cut' ||
      (theCutOrCopy === 'copy' &&
        theCurrentPlaylist?.id !== theCutOrCopyFromPlaylistId)
    ) {
      etc.push('pasting');
    } else if (theCutOrCopy != null) {
      etc.push(theCutOrCopy);
    }

    return etc;
  },
  []
);

onDestroy((): void => {
  setTimeout((): void => {
    void (async (): Promise<void> => {
      await tick();
      trackSettings.set(undefined);
    })();
  });
});
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#tracks-container {
  table.tab {
    tbody tr {
      &.selected {
        background-color: colors.$highlight-darker;

        @media (hover: hover) {
          &:hover {
            background-color: colors.$highlight-less-darker;
          }
        }
      }

      &.cutting {
        background-color: black !important;

        td,
        td.rating span {
          color: #888 !important;
        }
      }

      &.copying {
        background-color: colors.$bright-gray !important;

        td,
        td.rating span {
          color: white !important;
        }
      }

      &.playing {
        td.ix {
          border-left-color: colors.$highlight;
          color: colors.$highlight;
        }

        @media screen and (max-width: dims.$mobile-cutoff) {
          box-shadow: 5px 0 0 0 colors.$highlight inset;
        }
      }
    }

    .pasting & {
      tbody {
        tr:not(.cutting) {
          background-color: colors.$med-gray !important;

          &:nth-of-type(2n) {
            background-color: colors.$dark-gray !important;
          }
        }
      }
    }

    td,
    th {
      font-size: 11px;
      padding-left: 8px;
      padding-right: 8px;
      vertical-align: middle;

      &.ix {
        width: 2em;
      }

      &.id {
        width: 27em;
      }

      &.cached {
        width: 2em;
      }

      &.rating {
        width: 5em;
      }

      &.genre {
        width: 9.5em;
      }

      &.track {
        width: 6em;
        text-align: center;
      }

      &.compilation {
        width: 8em;
        text-align: center;
      }

      &.disc {
        width: 4.5em;
        text-align: center;
      }

      &.rating {
        width: 5em;
        text-align: center;
      }

      &.year {
        width: 4.5em;
        text-align: center;
      }

      &.n-plays {
        width: 4em;
      }

      &.file-size {
        width: 7em;
      }

      &.duration {
        width: 5.5em;
      }

      &.bitrate {
        width: 5.5em;
      }

      &.start-at,
      &.stop-at {
        width: 5.5em;
      }

      &.created-at,
      &.updated-at,
      &.last-played {
        width: 13.5em;
      }
    }

    td {
      &.ix {
        color: colors.$dim-text;
        border-left: transparent solid 2px;
      }

      &.cached {
        span {
          display: inline-block;
          opacity: 0;

          &.is-cached {
            opacity: 1;
          }
        }
      }

      &.track,
      &.disc {
        white-space: nowrap;
      }

      &.duration,
      &.nPlays,
      &.year,
      &.lastPlayed,
      &.createdAt,
      &.updatedAt {
        font-variant: tabular-nums;
      }
    }

    &.n-results-digits-1 {
      td.ix,
      th.ix {
        width: 2.5em;
      }
    }

    &.n-results-digits-2 {
      td.ix,
      th.ix {
        width: 3em;
      }
    }

    &.n-results-digits-3 {
      td.ix,
      th.ix {
        width: 4em;
      }
    }

    &.n-results-digits-4 {
      td.ix,
      th.ix {
        width: 5em;
      }
    }

    &.n-results-digits-5 {
      td.ix,
      th.ix {
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
            display: flex;
            padding: 10px;
            color: colors.$gray-text;
          }
        }
      }
    }
  }

  &.pasting.reorderable table.tab {
    thead {
      tr.cursor-below th {
        box-shadow: 0 2px 0 0 white;
      }
    }

    tbody {
      tr {
        background-color: colors.$med-gray !important;

        &:nth-of-type(2n) {
          background-color: colors.$dark-gray !important;
        }

        &.cursor-below td {
          box-shadow: inset 0 -2px 0 0 white !important;
        }
      }
    }
  }
}
</style>
