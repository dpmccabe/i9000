<!--svelte-ignore a11y-mouse-events-have-key-events-->
<!--svelte-ignore a11y-click-events-have-key-events-->
<!--svelte-ignore a11y-label-has-associated-control-->
<!--eslint-disable @typescript-eslint/no-unsafe-argument -->
<div class="tag-input" class:modified="{modified}">
  {#if type === TagField.StaticField}
    <label>{labelText}</label>
    <div class="input">
      <div class="static" class:mixed="{!tv.allIdentical}">
        {tv.allIdentical ? value : '(mixed)'}
      </div>
    </div>
  {:else if type === TagField.StaticDuration}
    <label>{labelText}</label>
    <div class="input">
      <div class="static" class:mixed="{!tv.allIdentical}">
        {tv.allIdentical ? formatDuration(value, true) : '(mixed)'}
      </div>
    </div>
  {:else if type === TagField.StaticTimestamp}
    <label>{labelText}</label>
    <div class="input">
      <div class="static" class:mixed="{!tv.allIdentical}">
        {tv.allIdentical ? formatDateTime(value) : '(mixed)'}
      </div>
    </div>
  {:else if type === TagField.TextField}
    <label for="tag-{inputId}-text">{labelText}</label>
    <div class="input">
      <div class="suggestible-input">
        <input
          id="tag-{inputId}-text"
          type="text"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          class:with-suggestions="{withSuggestions}"
          bind:value="{value}"
          placeholder="{tv.allIdentical || modified ? '' : '(mixed)'}"
          on:keydown="{(ev) => selectSuggestion(ev)}"
          on:input="{() => setValue()}"
          on:blur="{() => resetSuggestions()}" />

        {#if withSuggestions}
          <div class="suggestions">
            <ul>
              {#if tagSuggestions.length === 0}
                <li>
                  <div class="no-suggestions">(no suggestions)</div>
                </li>
              {:else}
                {#each tagSuggestions as suggestion, i}
                  <li>
                    <a
                      href="#top"
                      role="button"
                      class:active="{i === suggestionIx}"
                      on:mousedown|preventDefault="{() => chooseSuggestion(i)}"
                      >{suggestion}</a>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
        {/if}
      </div>
    </div>
  {:else if type === TagField.NumberField}
    <label for="tag-{inputId}-numeric">{labelText}</label>
    <div class="input">
      <input
        id="tag-{inputId}-numeric"
        type="number"
        maxlength="4"
        bind:value="{value}"
        placeholder="{tv.allIdentical || modified ? '' : '-'}"
        on:input="{() => setValue()}" />
    </div>
  {:else if type === TagField.DurationField}
    <label for="tag-{inputId}-duration-input">{labelText}</label>
    <div class="input">
      <input id="tag-{inputId}-duration" type="hidden" bind:value="{value}" />
      <input
        id="tag-{inputId}-duration-input"
        type="text"
        maxlength="11"
        class="duration"
        bind:value="{durationValue}"
        placeholder="{tv.allIdentical || modified ? '' : '-'}"
        on:input="{() => parseDuration()}" />
    </div>
  {:else if type === TagField.TimestampField}
    <label for="tag-{inputId}-timestamp">{labelText}</label>
    <div class="input">
      <input id="tag-{inputId}-timestamp" type="hidden" bind:value="{value}" />
      <input
        id="tag-{inputId}-timestamp-input"
        type="text"
        maxlength="20"
        class="timestamp"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        bind:value="{timestampValue}"
        placeholder="{tv.allIdentical || modified ? '' : '-'}"
        on:input="{() => parseTimestamp()}" />
    </div>
  {:else if type === TagField.OrdinalField}
    <label for="tag-{inputId}-ordinal-1">{labelText}</label>

    <div class="input">
      <div class="ordinal">
        <input
          id="tag-{inputId}-ordinal-1"
          type="number"
          maxlength="3"
          bind:value="{value}"
          placeholder="{tv.allIdentical || modified ? '' : '-'}"
          on:input="{() => setValue()}" />
        <span class="less-imp">of</span>

        <label for="tag-{inputId}-ordinal-2" style="display: none"></label>
        <input
          id="tag-{inputId}-ordinal-2"
          type="number"
          maxlength="3"
          bind:value="{value2}"
          placeholder="{tv2.allIdentical || modified2 ? '' : '-'}"
          on:input="{() => setValue2()}" />
      </div>
    </div>
  {:else if type === TagField.CheckboxField}
    <label for="tag-{inputId}-checkbox">{labelText}</label>

    <div class="input">
      <input id="tag-{inputId}-checkbox" type="hidden" bind:value="{value}" />

      <div on:click="{() => cycleCheckbox()}" id="checkbox-states">
        <span class:visible="{!tv.allIdentical && !modified}">
          <Fa icon="{faMinusSquare}" fw size="lg" />
        </span>

        <span class:visible="{(tv.allIdentical || modified) && value === true}">
          <Fa icon="{faCheckSquare}" fw size="lg" />
        </span>

        <span class:visible="{(tv.allIdentical || modified) && value !== true}">
          <Fa icon="{faSquare}" fw size="lg" />
        </span>
      </div>
    </div>
  {:else if type === TagField.RatingField}
    <label for="tag-rating">rating</label>
    <div class="input">
      <input id="tag-rating" type="hidden" bind:value="{value}" />
      <div id="edit-stars">
        {#each [1, 2, 3] as i}
          <span
            id="{`edit-star-${i}`}"
            class="edit-star"
            class:all-identical="{tv.allIdentical}"
            class:achieved="{value >= i}"
            class:hovering="{hoveringStar != null}"
            class:hovering-at-or-below="{hoveringStar >= i}"
            class:modified="{modified}"
            on:mouseover="{() => hoverOverStar(i)}"
            on:mouseout="{() => hoverOverStar(null)}"
            on:click="{() => setStar(i)}">★</span>
        {/each}
      </div>
    </div>
  {/if}

  {#if ![TagField.StaticField, TagField.StaticDuration, TagField.StaticTimestamp].includes(type)}
    <div class="actions">
      <button
        disabled="{!(value !== '' || (initialValue2 != null && value2 !== ''))}"
        on:click|preventDefault="{() => clearValue()}">
        <Fa icon="{faEraser}" fw size="lg" />
      </button>

      {#if type === TagField.TextField}
        <button
          disabled="{!(value != null && value !== '')}"
          on:click|preventDefault="{() => cutValue()}">
          <Fa icon="{faCut}" fw size="lg" />
        </button>
      {:else}
        <span class="na"
          ><Fa icon="{faEllipsisH}" scale="{0.7}" fw size="lg" /></span>
      {/if}

      {#if type === TagField.TextField}
        <button
          disabled="{!(value != null && value !== '')}"
          on:click|preventDefault="{() => copyValue()}">
          <Fa icon="{faCopy}" fw size="lg" />
        </button>
      {:else}
        <span class="na"
          ><Fa icon="{faEllipsisH}" scale="{0.7}" fw size="lg" /></span>
      {/if}

      {#if type === TagField.TextField}
        <button
          disabled="{valueToPaste == null}"
          on:click|preventDefault="{() => pasteValue()}">
          <Fa icon="{faPaste}" fw size="lg" />
        </button>
      {:else}
        <span class="na"
          ><Fa icon="{faEllipsisH}" scale="{0.7}" fw size="lg" /></span>
      {/if}

      <button
        disabled="{!(modified || modified2)}"
        on:click|preventDefault="{() => resetValue()}">
        <Fa icon="{faUndo}" fw size="lg" />
      </button>
    </div>
  {/if}
</div>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  faCheckSquare,
  faMinusSquare,
  faSquare,
} from '@fortawesome/free-regular-svg-icons';
import {
  faCopy,
  faCut,
  faEllipsisH,
  faEraser,
  faPaste,
  faUndo,
} from '@fortawesome/free-solid-svg-icons';
import { type DateTime } from 'luxon';
import { onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import {
  autocompleteTag,
  escapeRegExp,
  formatDateTime,
  formatDuration,
  parseDateTime,
  type TagEditValue,
  TagField,
} from '../../internal';

export let type: TagField = TagField.TextField;
export let suggestionColName: string | null = null;
export let staticSuggestions: string[] | null = null;
export let inputId: string;
export let labelText: string;
export let tv: TagEditValue;
export let tv2: TagEditValue | null = null;
export let valueToPaste: string | null = null;

let initialValue: any;
let durationValue: string;
let timestampValue: string;
let initialValue2: any;
let value: any;
let value2: any;
let modified = false;
let modified2 = false;
let suggesting = false;
let suggestionIx: number | null;
let hoveringStar: number | null;
let typingWaiter: number;
let tagSuggestions: string[] = [];

$: withSuggestions =
  suggestionColName != null &&
  suggesting &&
  value != null &&
  (tagSuggestions.length > 1 ||
    (tagSuggestions.length === 1 && tagSuggestions[0] !== value));

onMount((): void => {
  if (tv.allIdentical) {
    initialValue = tv.commonValue;
    value = initialValue;
  }

  if (type === TagField.DurationField && value != null) {
    durationValue = formatDuration(value as number, true);
  } else if (type === TagField.TimestampField && value != null) {
    timestampValue = formatDateTime(value as DateTime);
  }

  if (tv2?.allIdentical) {
    initialValue2 = tv2.commonValue;
    value2 = initialValue2;
  }
});

function extendTimeout(): void {
  window.clearTimeout(typingWaiter);

  typingWaiter = setTimeout(
    (): void => {
      void (async (): Promise<void> => {
        await suggestTags(
          suggestionColName!,
          value as string,
          staticSuggestions
        );
        suggesting = true;
        suggestionIx = null;
      })();
    },
    staticSuggestions == null ? 500 : 0
  );
}

async function suggestTags(
  colName: string,
  tagValue: string,
  staticSuggestions: string[] | null
): Promise<void> {
  if (staticSuggestions == null) {
    tagSuggestions = await autocompleteTag(colName, tagValue, 5);
  } else {
    const regex = new RegExp('\\b' + escapeRegExp(tagValue), 'i');
    tagSuggestions = staticSuggestions
      .filter((s: string): boolean => {
        return regex.test(s);
      })
      .slice(0, 5);
  }
}

function resetSuggestions(): void {
  tagSuggestions = [];
  suggesting = false;
  suggestionIx = null;
}

function chooseSuggestion(i: number | null): void {
  if (i != null) value = tagSuggestions[i];
  resetSuggestions();
  setValue(true);
}

function selectSuggestion(ev: KeyboardEvent): void {
  if (suggestionColName == null) return;

  if (ev.key === 'ArrowDown') {
    ev.preventDefault();

    if (tagSuggestions.length > 0) {
      if (suggestionIx == null) {
        suggestionIx = 0;
      } else if (suggestionIx < tagSuggestions.length - 1) {
        suggestionIx++;
      }
    }
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();

    if (tagSuggestions.length > 0) {
      if (suggestionIx == null) {
        suggestionIx = tagSuggestions.length - 1;
      } else if (suggestionIx > 0) {
        suggestionIx--;
      }
    }
  } else if (ev.key === 'Enter' && suggesting && tagSuggestions.length > 0) {
    ev.preventDefault();
    ev.stopPropagation();
    chooseSuggestion(suggestionIx);
  } else if (ev.key === 'Escape' && suggesting) {
    ev.stopPropagation();
    resetSuggestions();
  }
}

function parseDuration(): void {
  try {
    let x: string = durationValue;
    let ms = 0;

    const fracMatches: RegExpMatchArray | null = x.match(/\.[0-9]+$/);

    if (fracMatches) {
      ms += parseFloat('0' + fracMatches[0]) * 1000;
      x = x.replace(/\.[0-9]+$/, '');
    }

    const secMatches: RegExpMatchArray | null = x.match(/[0-9]+$/);

    if (secMatches) {
      ms += parseInt(secMatches[0]) * 1000;
      x = x.replace(/:*[0-9]+$/, '');
    }

    const minMatches: RegExpMatchArray | null = x.match(/[0-9]+$/);

    if (minMatches) {
      ms += parseInt(minMatches[0]) * 1000 * 60;
      x = x.replace(/:*[0-9]+$/, '');
    }

    if (x.length > 0) {
      // hours
      ms += parseInt(x) * 1000 * 60 * 60;
    }

    if (!isNaN(ms)) {
      value = ms;
      setValue();
    }
  } catch (e: any) {
    console.log(e);
  }
}

function parseTimestamp(): void {
  const parsedDt: DateTime = parseDateTime(timestampValue);

  if (parsedDt.isValid) {
    value = parsedDt;
    setValue();
  }
}

function setValue(skipSuggest = false): void {
  if (value != null && type === TagField.TextField) {
    value = value as string;

    if (value === '') {
      value = null;
    } else if (suggestionColName != null && !skipSuggest) {
      extendTimeout();
    }
  } else if (
    type === TagField.OrdinalField ||
    type === TagField.NumberField ||
    type === TagField.DurationField ||
    type === TagField.RatingField
  ) {
    if (value === '') {
      value = null;
    } else if (value != null) {
      value = parseInt(value as string);
    }
  }

  modified = value !== initialValue;

  if (modified) {
    tv.newValue = value;
  } else {
    tv.newValue = undefined;
  }
}

function setValue2(): void {
  if (value2 != null && type === TagField.TextField) {
    value2 = (value2 as string).trim();

    if (value2 === '') {
      value2 = null;
    }
  } else if (type === TagField.OrdinalField || type === TagField.NumberField) {
    if (value2 === '') {
      value2 = null;
    } else if (value2 != null) {
      value2 = parseInt(value2 as string);
    }
  }

  modified2 = value2 !== initialValue2;

  if ('newValue' in tv2) {
    if (modified2) {
      tv2.newValue = value2;
    } else {
      tv2.newValue = undefined;
    }
  }
}

function resetValue(): void {
  value = initialValue;
  resetSuggestions();
  setValue(true);

  if (type === TagField.DurationField) {
    durationValue = formatDuration(initialValue as number, true);
  } else if (type === TagField.TimestampField) {
    timestampValue = formatDateTime(initialValue as DateTime);
  }

  if (tv2 != null) {
    value2 = initialValue2;
    setValue2();
  }
}

function clearValue(): void {
  value = '';
  resetSuggestions();
  setValue(true);

  if (type === TagField.DurationField) {
    durationValue = '';
  } else if (type === TagField.TimestampField) {
    timestampValue = '';
  }

  if (tv2 != null) {
    value2 = '';
    setValue2();
  }
}

function cutValue(): void {
  valueToPaste = value.toString();
  value = '';
  resetSuggestions();
  setValue(true);
}

function copyValue(): void {
  resetSuggestions();
  valueToPaste = value.toString();
}

function pasteValue(): void {
  value = valueToPaste;
  resetSuggestions();
  setValue(true);
}

function cycleCheckbox(): void {
  if (value == null) {
    value = true;
  } else {
    value = !value;
  }

  setValue();
}

function hoverOverStar(star: number): void {
  hoveringStar = star;
}

function setStar(star: number): void {
  value = star;
  setValue();
}
</script>
