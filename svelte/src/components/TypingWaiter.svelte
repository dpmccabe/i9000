<!--svelte-ignore a11y-click-events-have-key-events-->
<div class="typing-waiter" class:clearable="{text !== ''}">
  {#if leftIcon != null}
    <span on:click="{() => textInput.focus()}" class="left-icon">
      <Fa icon="{leftIcon}" fw size="lg" />
    </span>
  {/if}

  <input
    bind:this="{textInput}"
    type="text"
    autocapitalize="off"
    autocomplete="off"
    spellcheck="false"
    on:keyup="{extendTimeout}"
    on:blur="{updateText}" />

  <a
    href="#top"
    role="button"
    class="clearer"
    on:click|preventDefault="{clearInput}">
    <Fa icon="{faEraser}" fw size="lg" />
  </a>
</div>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */

import { type IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { faEraser } from '@fortawesome/free-solid-svg-icons';
import { createEventDispatcher, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import { type DispatchOptions } from 'svelte/internal';

export let leftIcon: IconDefinition | undefined = undefined;
export let waitTime = 500;
export let text = '';
let textInput: HTMLInputElement;
let timeout: number;

onMount((): void => {
  textInput.value = text;
});

const dispatch: <EventKey extends Extract<keyof any, string>>(
  type: EventKey,
  detail?: any,
  options?: DispatchOptions
) => boolean = createEventDispatcher();

export function focus(): void {
  textInput.focus();
}

function extendTimeout(ev: KeyboardEvent): void {
  if (ev.key === 'Enter') {
    updateText();
    return;
  }

  window.clearTimeout(timeout);
  timeout = window.setTimeout(updateText, waitTime);
}

function clearInput(): void {
  textInput.value = '';
  updateText();
}

function updateText(): void {
  if (text === textInput.value) return;

  text = textInput.value;
  dispatch('textUpdated', text);
  window.clearTimeout(timeout);
}
</script>

<style lang="scss" global>
@use '../assets/colors';

.typing-waiter {
  position: relative;
  font-size: 11px;

  span.left-icon {
    svg.svelte-fa {
      position: absolute;
      top: 8px;
      left: 8px;
      color: colors.$dim-text;
    }
  }

  input[type='text'] {
    width: 100%;
  }

  span.left-icon + input[type='text'] {
    padding-left: 32px;
  }

  a.clearer {
    position: absolute;
    right: 0;
    top: 0;
    padding: 0 8px;
    font-size: unset;
    display: none;
    height: 100%;

    svg.svelte-fa {
      color: colors.$dim-text;
    }

    &:hover svg.svelte-fa {
      color: white;
    }
  }

  &.clearable a.clearer {
    display: flex;
    align-items: center;
  }
}
</style>
