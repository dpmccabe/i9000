{#if $prompt?.shown}
  <Modal
    isPrompt="{true}"
    id="prompt"
    maskAction="{() => ($prompt.shown = false)}"
    mountAction="{() => $prompt.textInput?.focus()}">
    <span slot="title">{$prompt.title}</span>

    <div slot="content">
      <form on:submit|preventDefault="{submitPrompt}" class="prompt">
        {#if $prompt.hasTextInput}
          <label>
            <input
              name="prompt-text"
              type="text"
              placeholder="{$prompt.textPlaceholder}"
              bind:this="{$prompt.textInput}"
              bind:value="{$prompt.textInputValue}" />
          </label>
        {/if}

        <button
          type="button"
          on:click="{() => ($prompt.shown = false)}"
          class="cancel">Cancel</button>

        <button type="submit" disabled="{working}" class:working="{working}">
          <span>Yes</span>
          <Fa icon="{faSpinner}" size="sm" spin /></button>
      </form>
    </div>
  </Modal>
{/if}

<script lang="ts">
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import { logMessage, prompt } from '../../internal';
import Modal from './Modal.svelte';

let working = false;

function submitPrompt(): void {
  try {
    working = true;
    $prompt!.okAction();
    $prompt!.shown = false;
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(e.message, 'error');
    } else {
      console.log(e);
    }
  } finally {
    working = false;
  }
}
</script>

<style lang="scss" global>
form.prompt {
  min-width: 250px;

  label {
    display: block;
    margin-bottom: 1rem;

    input[type='text'] {
      width: 100%;
    }
  }

  button {
    display: inline-block;

    &.cancel {
      margin-right: 1rem;
    }
  }
}
</style>
