<!--svelte-ignore a11y-click-events-have-key-events-->
<div
  id="player"
  class="{$playingTrack?.genreColor}"
  class:$short="{$short}"
  class:playing="{$playingTrack != null}"
  draggable="false"
  bind:this="{playerEl}"
  on:pointerdown="{(ev) => startSwipePlayer(ev)}"
  on:pointerup="{(ev) => endSwipePlayer(ev)}">
  {#if $playingTrack != null}
    <ul id="player-buttons">
      <li>
        <button
          class:available="{() => $playingTrack != null || $canPlayPrev}"
          on:click="{prevTrack}">
          <Fa icon="{faStepBackward}" fw size="2x" />
        </button>
      </li>

      <li class="scrub-button">
        <button
          class:available="{() => $playingTrack != null && $currentTime >= 3}"
          on:click="{() => scrubRelative(-3)}">
          <Fa icon="{faBackward}" fw />
        </button>
      </li>

      <li>
        <button
          class="available"
          on:pointerdown|stopPropagation="{() =>
            (playButtonTimer = Date.now())}"
          on:pointerup|stopPropagation="{() => playButtonMouseup()}"
          on:pointerleave="{() => (playButtonTimer = 0)}"
          id="play-button">
          <Fa icon="{playPauseStopIcon}" fw size="3x" />
        </button>
      </li>

      <li class="scrub-button">
        <button
          class:available="{() =>
            $playingTrack != null &&
            $currentTime != null &&
            $currentTime + 3 <= $duration}"
          on:click="{() => scrubRelative(3)}">
          <Fa icon="{faForward}" fw />
        </button>
      </li>

      <li>
        <button class:available="{$canPlayNext}" on:click="{nextTrack}">
          <Fa icon="{faStepForward}" fw size="2x" />
        </button>
      </li>
    </ul>

    <div id="currently-playing">
      {#if $playingTrack}
        {#if $short}
          <TinyTrackInfo track="{$playingTrack}" />
        {:else}
          <TrackInfo track="{$playingTrack}" />
        {/if}

        <div id="scrubber">
          <div id="elapsed-time" class="scrubber-time">
            {$currentTime != null ? formatDuration($currentTime * 1000) : ''}
          </div>

          <div
            id="progress-bar"
            on:mouseenter="{() => {
              scrubbing = true;
            }}"
            on:mousemove="{scrubPreview}"
            on:mouseleave="{() => {
              scrubbing = false;
            }}">
            <div
              id="completed"
              style="width: {($currentTime / $duration) * 100}%;">
            </div>
            {#if scrubbing}
              <div
                id="scrub-to"
                on:click="{() => {
                  scrubTo(scrubToPos * $duration);
                }}">
                <div id="scrub-to-time">{scrubToTime}</div>
              </div>
            {/if}
          </div>

          <div id="total-time" class="scrubber-time">
            {$currentTime != null
              ? '-' + formatDuration(($duration - $currentTime) * 1000)
              : ''}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
import { type IconDefinition } from '@fortawesome/free-brands-svg-icons';
import {
  faBackward,
  faForward,
  faPause,
  faPlay,
  faStepBackward,
  faStepForward,
  faStop,
} from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  canPlayNext,
  canPlayPrev,
  currentTime,
  duration,
  formatDuration,
  nextTrack,
  paused,
  playingTrack,
  playOrPause,
  prevTrack,
  scrubRelative,
  scrubTo,
  short,
  stopPlayback,
} from '../../internal';
import TinyTrackInfo from './TinyTrackInfo.svelte';
import TrackInfo from './TrackInfo.svelte';

let scrubbing = false;
let scrubToPos: number;
let scrubToTime: string;
let playerEl: HTMLElement;
let playerSwipeTimer = 0;
let playerSwipeStartPos: [number, number] = [0, 0];
let playButtonTimer = 0;
let playPauseStopIcon: IconDefinition;

$: {
  if (playButtonTimer > 400) {
    playPauseStopIcon = faStop;
  } else if ($playingTrack == null || $paused) {
    playPauseStopIcon = faPlay;
  } else {
    playPauseStopIcon = faPause;
  }
}

function scrubPreview(ev: MouseEvent): void {
  scrubbing = true;

  const rect: DOMRect = document
    .getElementById('progress-bar')
    .getBoundingClientRect();
  let newPos: number = (ev.clientX - rect.left) / rect.width;

  if (newPos < 0) {
    newPos = 0;
  } else if (newPos > 1) {
    newPos = 1;
  }

  const scrubEl: HTMLElement = document.getElementById('scrub-to')!;
  scrubEl.style.left = `calc(${newPos * 100}% - 1px)`;

  scrubToPos = newPos;
  scrubToTime = formatDuration(newPos * $duration * 1000);
}

async function playButtonMouseup(): Promise<void> {
  if (Date.now() - playButtonTimer > 400) {
    stopPlayback();
  } else {
    await playOrPause();
  }

  playButtonTimer = 0;
}

function startSwipePlayer(ev: PointerEvent): void {
  playerSwipeTimer = Date.now();
  playerSwipeStartPos = [ev.clientX, ev.clientY];
}

function endSwipePlayer(ev: PointerEvent): void {
  if (
    Date.now() - playerSwipeTimer < 1000 &&
    Math.abs(playerSwipeStartPos[0] - ev.clientX) >
      document.getElementById('player').clientWidth / 2 &&
    Math.abs(playerSwipeStartPos[1] - ev.clientY) <
      document.getElementById('player').clientHeight
  ) {
    if (playerSwipeStartPos[0] < ev.clientX) {
      playerEl.classList.add('swiping-right');
    } else {
      playerEl.classList.add('swiping-left');
    }

    stopPlayback(true);
  }
}
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#player {
  display: grid;
  margin: 0 0 0 15px;
  padding: 0;
  grid-template-columns: 350px auto;
  transition: transform 200ms linear, opacity 200ms linear;
  background-color: colors.$darkest-gray;
  border-radius: 0 0 0 15px;
  touch-action: none;

  @media screen and (max-width: dims.$mobile-cutoff) {
    grid-row: 2 / 3;
    margin: 0;
    border-radius: 0;
    grid-template-columns: unset;
    grid-template-rows: auto auto;
    border-top: solid colors.$bright-gray 1px;
  }

  @media screen and (max-height: dims.$tiny-height-cutoff) {
    display: none;

    &.playing {
      display: grid;
      position: absolute;
      height: 100%;
      width: 100%;
      grid-template-rows: 100px auto;
      border-top: none;
      grid-template-columns: unset;
      column-gap: unset;
      background-color: black;

      ul#player-buttons {
        grid-template-columns: 1fr 1fr 1fr;

        li.scrub-button {
          display: none;
        }
      }

      #currently-playing {
        width: 100%;
        margin: 0 0 20px 0;
        display: grid;
        grid-template-rows: auto 16px;
        grid-row-gap: 20px;
        justify-content: unset;

        #current-track-info {
          margin: 0 20px;
          overflow: hidden;

          #queue-position {
            justify-self: unset;
            font-size: 16px;
            text-align: center;
            margin-bottom: 20px;

            a {
              text-decoration: none;
            }
          }

          #current-artist {
            font-weight: 500;
          }

          #current-album {
            margin-top: 5px;
            font-weight: 300;
          }

          #current-title {
            margin-top: 20px;

            span#current-rating {
              color: colors.$yellow-star;
            }
          }
        }

        #scrubber {
          height: 16px;
          margin: 0;

          div.scrubber-time {
            width: 60px;
            font-size: 16px;
          }

          #progress-bar #completed {
            height: 16px;
          }
        }
      }
    }
  }

  ul#player-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    column-gap: 10px;
    list-style-type: none;
    padding: 0;
    margin: 0 30px;

    @media screen and (max-width: dims.$mobile-cutoff) {
      width: 100%;
      max-width: 800px;
      margin: 15px auto;
      column-gap: 20px;
    }

    li {
      button {
        background-color: transparent;
        border: none;
        color: white;
        outline: none;
        opacity: 0.5;
        text-align: center;
        height: 100%;
        width: 100%;
        padding: 10px;

        &.available {
          opacity: 1;
          cursor: pointer;

          @media (hover: hover) {
            &:hover {
              color: colors.$highlight;
            }
          }
        }
      }
    }
  }

  #currently-playing {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin: 0 0 10px 0;
    overflow: hidden;

    @media screen and (max-width: dims.$mobile-cutoff) {
      margin-top: 0;
    }

    #current-track-info {
      margin: 0 6em;
      user-select: text;

      @media screen and (max-width: dims.$mobile-cutoff) {
        margin: 0 15px;
      }

      #current-artist-and-qp {
        display: grid;
        grid-template-columns: auto auto;
        align-items: center;
        justify-items: stretch;
        grid-column-gap: 20px;

        @media screen and (max-width: dims.$mobile-cutoff) {
          align-items: start;

          #artist-title-sep {
            display: none;
          }
        }

        #current-artist-and-title {
          font-size: 16px;
          display: grid;
          grid-template-columns:
            minmax(auto, max-content) minmax(auto, max-content)
            minmax(auto, max-content) minmax(auto, max-content) minmax(auto, max-content);
          grid-column-gap: 10px;
          align-items: center;

          @media screen and (max-width: dims.$mobile-cutoff) {
            grid-template-columns: unset;
            grid-template-rows:
              minmax(auto, max-content) minmax(auto, max-content)
              minmax(auto, max-content) minmax(auto, max-content);
          }

          span#current-artist {
            font-weight: 500;

            span.less-imp {
              font-weight: normal;
            }
          }

          #current-icons {
            font-size: 11px;
            display: flex;
            flex-direction: row;
            column-gap: 5px;
            align-items: center;

            span#current-rating {
              color: colors.$yellow-star;
            }
          }
        }

        #queue-position {
          justify-self: right;
          font-size: 11px;

          a {
            text-decoration: none;
          }
        }
      }

      #current-album {
        font-size: 13px;
      }
    }

    #scrubber {
      margin: 10px 0 2px 0;
      width: 100%;
      height: 12px;
      display: flex;
      flex-direction: row;
      align-items: center;

      div.scrubber-time {
        width: 6em;
        font-variant: tabular-nums;

        &#elapsed-time {
          text-align: right;
          padding-right: 5px;
        }

        &#total-time {
          padding-left: 5px;
        }
      }

      #progress-bar {
        height: 100%;
        background-color: #444;
        flex-grow: 1;
        position: relative;

        #completed {
          position: absolute;
          left: 0;
          height: 12px;
          width: 0;
          background-color: colors.$gray-text;
        }

        #scrub-to {
          position: absolute;
          top: -2px;
          width: 2px;
          height: 16px;
          background-color: white;

          #scrub-to-time {
            position: absolute;
            margin-top: -25px;
            transform: translateX(-50%);
            background-color: colors.$gray-text;
            font-weight: bold;
            border-radius: 5px;
            padding: 3px;
            color: colors.$dark-gray;
            text-align: center;
            font-variant: tabular-nums;
          }
        }
      }
    }
  }

  &.swiping-away {
    opacity: 0;

    &.swiping-down {
      transform: translate(0, 100%);
    }

    &.swiping-left {
      transform: translate(-100%, 0);
    }

    &.swiping-right {
      transform: translate(100%, 0);
    }
  }
}
</style>
