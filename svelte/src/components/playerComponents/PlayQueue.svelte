<Modal id="play-queue">
  <span slot="title">
    Play queue
    <span id="pq-queue-pos">
      ({$queuePosition[0] + 1}&nbsp;/&nbsp;{$queuePosition[1] + 1})
    </span>
  </span>

  <div slot="content">
    <table>
      <tbody>
        {#each $playQueue.slice(Math.max($queuePosition[0] - 3, 0), $queuePosition[0] + 50) as track}
          <tr
            class="{track.genreColor}"
            class:playing="{track.id === $playingTrack.id}"
            on:dblclick="{async () => {
              await jumpToQueuePosition(track.ix ?? 0);
              activePane.set('main');
            }}"
            on:touchend|preventDefault="{() => playOnMobile(track.ix ?? 0)}">
            <td class="ix">{(track.ix ?? 0) + 1}</td>

            <td class="artist-title">
              <b>{track.artist}</b><br />{track.title}
            </td>
          </tr>
        {/each}

        {#if $queuePosition[1] > $queuePosition[0] + 50}
          <tr>
            <td class="ix">{$queuePosition[1] + 1}</td>
            <td>&hellip;</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</Modal>

<script lang="ts">
import { onMount } from 'svelte';
import {
  activePane,
  jumpToQueuePosition,
  playingTrack,
  playQueue,
  queuePosition,
} from '../../internal';
import Modal from '../modalComponents/Modal.svelte';

let tappedOnce = false;

onMount((): void => {
  document.getElementById('play-queue').focus();
});

async function playOnMobile(pos: number): Promise<void> {
  if (tappedOnce) {
    await jumpToQueuePosition(pos);
    activePane.set('main');
  } else {
    tappedOnce = true;
    setTimeout((): void => {
      tappedOnce = false;
    }, 400);
  }
}
</script>

<style lang="scss" global>
@use '../../assets/colors';

#play-queue {
  width: 500px;
  max-height: calc(50%);
  overflow-y: auto;

  &:focus {
    outline: none;
  }

  h2 {
    span#pq-queue-pos {
      color: #aaa;
      font-size: 13px;
    }
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;

    tr {
      &:nth-of-type(2n) {
        background-color: colors.$med-gray;
      }

      @media (hover: hover) {
        &:hover {
          background-color: #444;
        }
      }

      td.ix {
        text-align: right;
        padding: 2px 10px;
        border-left: solid 2px transparent;
        width: 5em;
      }

      td.artist-title {
        padding: 2px 10px 2px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-clamp: 1;
      }

      &.playing {
        td.ix {
          color: colors.$highlight;
          border-left-color: colors.$highlight;
        }
      }
    }
  }
}
</style>
