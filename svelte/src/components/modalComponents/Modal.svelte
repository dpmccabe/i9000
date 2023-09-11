<div
  class="mask"
  class:prompt-mask="{isPrompt}"
  on:mousedown|self="{() =>
    maskAction != null ? maskAction() : activePane.set('main')}">
  <div
    class="{['modal', ...classes].join(' ')}"
    id="{id}"
    transition:fly="{{ duration: 200, y: -100 }}">
    <a
      href="#top"
      class="m-closer"
      on:click|preventDefault="{() =>
        maskAction ? maskAction() : activePane.set('main')}"
      ><Fa icon="{faTimes}" fw size="lg" /></a>

    <!-- eslint-disable @typescript-eslint/no-unsafe-member-access -->
    {#if $$slots.title}
      <h2>
        <slot name="title" />
      </h2>
    {/if}

    <slot name="content" />
  </div>
</div>

<script lang="ts">
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { onDestroy, onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import { fly } from 'svelte/transition';
import { activePane } from '../../internal';

export let id: string;
export let classes: string[] = [];
export let isPrompt = false;
export let maskAction: undefined | (() => void) = undefined;
export let mountAction: undefined | (() => void) = undefined;

onMount((): void => {
  document.getElementById('everything')?.classList.add('masked');
  if (mountAction != null) mountAction();
});

onDestroy((): void => {
  document.getElementById('everything')?.classList.remove('masked');
});
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

.mask {
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;

  a.m-closer {
    display: none;
  }

  .modal {
    background-color: colors.$dark-gray;
    border-radius: 5px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);
    align-self: center;
    margin-left: auto;
    margin-right: auto;
    padding: 1rem;
    z-index: 1000;
    max-height: calc(100% - 60px);
    max-width: calc(100% - 60px);
    overflow-y: auto;

    h2 {
      margin-bottom: 1rem;
    }

    input[type='submit'],
    button[type='button'],
    button[type='submit'] {
      margin-bottom: 0;
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    display: block;
    background-color: unset;
    min-height: 100%;
    height: auto;

    a.m-closer {
      display: block;
      position: absolute;
      z-index: 1002;
      right: 0;
      top: 0;
      padding: calc(0.5rem + 13.5px) 1rem 13.5px 1rem;
      color: colors.$dim-text;

      @media (hover: hover) {
        &:hover {
          color: white;
        }
      }
    }

    .modal {
      position: absolute;
      z-index: 1001;
      width: 100% !important;
      min-height: 100%;
      max-width: 100%;
      height: auto;
      background-color: colors.$dark-gray;
      margin: 0;
      box-shadow: none;
    }
  }
}
</style>
