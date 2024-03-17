<!--svelte-ignore a11y-click-events-have-key-events-->
<Modal id="tag-editor">
  <span slot="title">Editing {$nTracksSelected} track(s)</span>

  <div slot="content">
    {#key tagValues}
      {#if tagValues != null}
        <form on:submit|preventDefault="{() => submitEdits()}">
          <fieldset>
            <legend>track</legend>

            <TagInput
              type="{TagField.CheckboxField}"
              inputId="compilation"
              labelText="compilation?"
              tv="{tagValues.compilation}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              suggestionColName="albumArtist"
              inputId="album-artist"
              labelText="album artist"
              tv="{tagValues.albumArtist}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              suggestionColName="artist"
              inputId="artist"
              labelText="artist"
              tv="{tagValues.artist}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              suggestionColName="album"
              inputId="album"
              labelText="album"
              tv="{tagValues.album}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              type="{TagField.OrdinalField}"
              inputId="disc"
              labelText="disc"
              tv="{tagValues.discI}"
              bind:valueToPaste="{valueToPaste}"
              tv2="{tagValues.discN}" />

            <TagInput
              type="{TagField.OrdinalField}"
              inputId="track"
              labelText="track"
              tv="{tagValues.trackI}"
              bind:valueToPaste="{valueToPaste}"
              tv2="{tagValues.trackN}" />

            <TagInput
              inputId="title"
              labelText="title"
              tv="{tagValues.title}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              inputId="composer"
              labelText="composer"
              tv="{tagValues.composer}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              type="{TagField.NumberField}"
              inputId="year"
              labelText="year"
              tv="{tagValues.year}"
              bind:valueToPaste="{valueToPaste}" />
          </fieldset>

          <fieldset>
            <legend>organization</legend>

            <TagInput
              suggestionColName="grouping"
              inputId="grouping"
              labelText="grouping"
              tv="{tagValues.grouping}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              suggestionColName="genre"
              staticSuggestions="{allGenreNames}"
              inputId="genre"
              labelText="genre"
              tv="{tagValues.genre}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              type="{TagField.RatingField}"
              inputId="rating"
              labelText="rating"
              tv="{tagValues.rating}"
              bind:valueToPaste="{valueToPaste}" />

            <TagInput
              inputId="comments"
              labelText="comments"
              tv="{tagValues.comments}"
              bind:valueToPaste="{valueToPaste}" />
          </fieldset>

          <fieldset class="expandable">
            <legend
              class="expand-toggle"
              on:click="{() => {
                playbackExpanded = !playbackExpanded;
              }}">
              playback
              {#if playbackExpanded}[-]{:else}[+]{/if}
            </legend>

            {#if playbackExpanded}
              <div transition:slide="{{ duration: 100 }}">
                <TagInput
                  type="{TagField.StaticField}"
                  inputId="nPlays"
                  labelText="plays"
                  tv="{tagValues.nPlays}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.StaticTimestamp}"
                  inputId="lastPlayed"
                  labelText="last played"
                  tv="{tagValues.lastPlayed}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.DurationField}"
                  inputId="startAt"
                  labelText="start at"
                  tv="{tagValues.startAt}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.DurationField}"
                  inputId="stopAt"
                  labelText="stop at"
                  tv="{tagValues.stopAt}"
                  bind:valueToPaste="{valueToPaste}" />
              </div>
            {/if}
          </fieldset>

          <fieldset class="expandable">
            <legend
              class="expand-toggle"
              on:click="{() => {
                metadataExpanded = !metadataExpanded;
              }}">
              metadata
              {#if metadataExpanded}[-]{:else}[+]{/if}
            </legend>

            {#if metadataExpanded}
              <div transition:slide="{{ duration: 100 }}">
                <TagInput
                  type="{TagField.StaticField}"
                  inputId="id"
                  labelText="id"
                  tv="{tagValues.id}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.StaticDuration}"
                  inputId="duration"
                  labelText="duration"
                  tv="{tagValues.duration}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.StaticField}"
                  inputId="bitrate"
                  labelText="bitrate"
                  tv="{tagValues.bitrate}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.StaticTimestamp}"
                  inputId="createdAt"
                  labelText="created at"
                  tv="{tagValues.createdAt}"
                  bind:valueToPaste="{valueToPaste}" />

                <TagInput
                  type="{TagField.StaticTimestamp}"
                  inputId="updatedAt"
                  labelText="updated at"
                  tv="{tagValues.updatedAt}"
                  bind:valueToPaste="{valueToPaste}" />
              </div>
            {/if}
          </fieldset>

          <div id="edit-tag-buttons">
            {#if $nTracksSelected === 1}
              <button
                type="button"
                disabled="{working}"
                on:click="{async () => await submitEdits(-1)}">
                ‹ Prev
              </button>
            {/if}

            <button type="submit" disabled="{working}" class:working="{working}"
              >Update
              <Fa icon="{faSpinner}" size="sm" spin />
            </button>

            {#if $nTracksSelected === 1}
              <button
                type="button"
                disabled="{working}"
                on:click="{async () => await submitEdits(1)}">
                Next ›
              </button>
            {/if}
          </div>
        </form>
      {/if}
    {/key}
  </div>
</Modal>

<svelte:window on:keydown="{keyDown}" />

<script lang="ts">
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { onDestroy, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import { slide } from 'svelte/transition';
import {
  activePane,
  getAllGenreNames,
  id3Map,
  logMessage,
  nTracksSelected,
  playingPlaylist,
  RetagOp,
  selectedTrackIds,
  selectedTracks,
  selectNextTrack,
  selectPreviousTrack,
  type TagEditValue,
  TagField,
  type Track,
  trackSettings,
  updateQueueFromPlaylist,
  updateTracks,
} from '../../internal';
import Modal from '../modalComponents/Modal.svelte';
import TagInput from './TagInput.svelte';

let working = false;
let playbackExpanded = false;
let metadataExpanded = false;
let allGenreNames: string[];
let valueToPaste: string | null;
let tagValues: Record<string, TagEditValue> | undefined;

onMount(async (): Promise<void> => {
  setTagValues();
  allGenreNames = await getAllGenreNames();
});

onDestroy((): void => {
  working = false;
});

async function submitEdits(advance: number | null = null): Promise<void> {
  if (working) return;

  working = true;
  await updateTags();

  if (advance == null) {
    activePane.set('tracks');
    document.getElementById('tracks')?.focus();
  } else {
    if (advance === -1) {
      selectPreviousTrack();
      setTagValues();
    } else {
      selectNextTrack();
      setTagValues();
    }

    working = false;
  }
}

async function keyDown(ev: KeyboardEvent): Promise<void> {
  if (ev.key === 'Enter') await submitEdits();
}

const editableTags: string[] = [
  'album',
  'albumArtist',
  'artist',
  'comments',
  'compilation',
  'composer',
  'discI',
  'discN',
  'genre',
  'grouping',
  'lastPlayed',
  'nPlays',
  'rating',
  'startAt',
  'stopAt',
  'title',
  'trackI',
  'trackN',
  'year',
  'id',
  'duration',
  'genreCat',
  'bitrate',
  'createdAt',
  'updatedAt',
];

function setTagValues(): void {
  const selTracks: Track[] = $selectedTracks;
  const itvs: Record<string, TagEditValue> = {};

  editableTags.forEach((tag: string): void => {
    itvs[tag] = {
      allIdentical: true,
      commonValue: undefined,
      newValue: undefined,
    };

    if (tag in selTracks[0]) {
      // init with first track's value
      itvs[tag].commonValue = selTracks[0].getStaticProperty(tag);
    }

    let i = 1;

    while (i < selTracks.length) {
      if (tag in selTracks[i]) {
        if (itvs[tag].commonValue !== selTracks[i].getStaticProperty(tag)) {
          // tag exists in this track but it doesn't match common value
          itvs[tag].allIdentical = false;
          itvs[tag].commonValue = undefined;
          break;
        }
      } else if (itvs[tag].commonValue != null) {
        // tag does exist in a previous track
        itvs[tag].allIdentical = false;
        itvs[tag].commonValue = undefined;
        break;
      }

      i++;
    }
  });

  tagValues = itvs;
  valueToPaste = null;
}

async function updateTags(): Promise<void> {
  let anyUpdated = false;
  let anyId3Updated = false;
  const updatedTags: Record<string, TagEditValue> = tagValues!;
  const commonId3Payload: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commonPatch: Record<string, any> = {
    updatedAt: DateTime.now().toMillis(),
  };

  for (const tag of Object.keys(updatedTags)) {
    if (updatedTags[tag].newValue !== undefined) {
      anyUpdated ||= true;

      if (tag in id3Map) {
        anyId3Updated ||= true;
        // eslint-disable-next-line
        commonId3Payload[id3Map[tag]] = updatedTags[tag].newValue as any;
      }

      if (tag === 'createdAt') {
        if (updatedTags[tag].newValue.length === 0) {
          commonPatch[tag] = null;
        } else {
          commonPatch[tag] = updatedTags[tag].newValue.toMillis();
        }
      } else {
        commonPatch[tag] = updatedTags[tag].newValue;
      }
    }
  }

  if (anyUpdated) {
    try {
      const updatedTrackIds: string[] = [...$selectedTrackIds];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any>[] = updatedTrackIds.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tid: string): { [p: string]: any; id: string } => {
          return { id: tid, ...commonPatch };
        }
      );

      await updateTracks(patch);

      if (anyId3Updated) {
        updatedTrackIds.forEach((tid: string): void => {
          new RetagOp(tid, commonId3Payload);
        });
      }

      trackSettings.touch();

      if ($playingPlaylist != null) {
        await updateQueueFromPlaylist($playingPlaylist);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        logMessage(`Error updating tags: "${e.message}"`, 'error');
      } else {
        console.error(e);
      }
    }
  }
}
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#tag-editor {
  form {
    width: 100%;

    .tag-input {
      display: grid;
      grid-template-columns: 8em 40em auto;
      grid-gap: 10px;
      align-items: center;
      width: 100%;
      margin: 0.5em 0;

      label {
        text-align: right;
      }

      .input {
        input[type='text'] {
          width: 100%;

          &.timestamp {
            width: 13em;
          }

          &.duration {
            width: 7em;
          }
        }

        input[type='number'] {
          width: 5em;
        }

        .static {
          user-select: text;
          font-size: 14px;
          color: white;

          &.mixed {
            color: #757575;
          }
        }

        .suggestible-input {
          position: relative;

          input[type='text'] {
            width: 100%;

            &.with-suggestions {
              border-bottom-left-radius: 0;
              border-bottom-right-radius: 0;
            }
          }

          .suggestions {
            position: absolute;
            width: 100%;
            top: 30px;
            font-size: 14px;
            background-color: colors.$highlight-darker;
            z-index: 1000;
            border: colors.$highlight-less-darker solid 1px;
            border-top: colors.$highlight-less-darker groove 2px;
            box-shadow: 0 10px 10px rgba(0, 0, 0, 0.5);

            ul {
              margin: 0;
              padding: 0;
              list-style-type: none;

              li {
                a {
                  display: block;
                  padding: 6px;
                  text-decoration: none;

                  &.active {
                    background-color: colors.$highlight-less-darker;
                  }

                  @media (hover: hover) {
                    &:hover {
                      background-color: colors.$highlight-less-darker;
                    }
                  }
                }

                .no-suggestions {
                  padding: 6px;
                  color: #888;
                }
              }
            }
          }
        }

        #checkbox-states {
          & > span {
            display: none;

            &.visible {
              display: inline-block;
            }
          }
        }

        .ordinal {
          input[type='number'] {
            flex-grow: unset;
            width: 3.5rem;
          }

          span.less-imp {
            display: inline-block;
            margin: 0 5px;
          }
        }

        #edit-stars {
          span.edit-star {
            font-size: 18px;
            opacity: 0.2;
            display: inline-block;
            padding: 0 3px;
            color: #fff;
            cursor: pointer;

            &.achieved,
            &.hovering-at-or-below {
              opacity: 1;
            }
          }
        }
      }

      .actions {
        display: flex;
        flex-direction: row;
        justify-content: space-between;

        button {
          color: colors.$gray-text;
          display: inline-block;
          padding: 5px;
          background-color: transparent;
          border: none;
          cursor: pointer;

          @media (hover: hover) {
            &:hover {
              color: white;
            }
          }

          &:disabled {
            cursor: not-allowed;
            color: colors.$bright-gray;
          }
        }

        span.na {
          padding: 5px;
          color: colors.$bright-gray;
        }
      }

      &.modified {
        label,
        span.edit-star,
        #checkbox-states svg {
          color: colors.$highlight !important;
        }

        input[type='text'],
        input[type='number'] {
          background-color: colors.$highlight-darker;
          border-color: colors.$highlight-darker;

          &:focus {
            background-color: colors.$highlight-less-darker;
          }
        }
      }

      @media screen and (max-width: dims.$mobile-cutoff) {
        grid-template-rows: auto auto;
        grid-template-columns: auto max-content;
        grid-row-gap: 3px;

        label {
          grid-column: 1 / 3;
          grid-row: 1 / 2;
          text-align: left;
        }

        .input {
          grid-column: 1 / 2;
          grid-row: 2 / 3;
        }

        .actions {
          grid-column: 2 / 3;
          grid-row: 2 / 3;

          button,
          span.na {
            padding: 5px 2px;
          }
        }
      }
    }

    #edit-tag-buttons {
      display: flex;
      flex-direction: row;
      justify-content: space-between;

      button {
        margin: 0.5rem 0 0 0 !important;

        &[type='submit'] {
          margin: 0.5rem auto 0 !important;
        }
      }
    }
  }
}
</style>
