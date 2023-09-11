<Modal id="command-bar">
  <span slot="title">Commands</span>

  <div slot="content">
    <form on:submit|preventDefault="{() => runCommand()}">
      <input
        type="text"
        name="command"
        id="command"
        maxlength="100"
        aria-label=""
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        bind:value="{$commandText}"
        on:keyup="{(ev) => updateHintText(ev)}" />
      <p id="hint">
        <span class="hint">{$hintText || 'enter a command'}</span>
      </p>
    </form>

    <fieldset>
      <legend>Commands</legend>

      <section>
        <div>
          <dl>
            {#each Object.keys(commands) as c}
              <dt>{c}</dt>
              <dd>{commands[c].hintTextBase}</dd>
            {/each}
          </dl>
        </div>
      </section>
    </fieldset>
  </div>
</Modal>

<script lang="ts">
import { onMount } from 'svelte';
import { commands, commandText, hintText, logMessage } from '../../internal';
import Modal from './Modal.svelte';

const r = new RegExp('^(?<cmd>[a-z]+)(?<args>\\s*.*)');
$: commandParts = $commandText.match(r);
$: command = '';
$: commandArg = '';

$: if (commandParts == null) {
  command = '';
  commandArg = '';
} else {
  command = commandParts.groups.cmd;
  commandArg = commandParts.groups.args.trim();
}

onMount((): void => {
  document.getElementById('command').focus();
});

function updateHintText(ev: KeyboardEvent): void {
  // reset error text only if not (re-)submitting
  if (ev.key === 'Enter') return;

  if (command in commands) {
    commands[command].hinter(commandArg);
  } else {
    hintText.set('');
  }
}

async function runCommand(): Promise<void> {
  if (command in commands) {
    try {
      await commands[command].handler(commandArg);
    } catch (e: unknown) {
      if (e instanceof Error) {
        logMessage(e.message, 'error');
      } else {
        console.log(e);
      }
    }
  } else {
    logMessage(`Command &lt;${command}&gt; not found`, 'error');
  }
}
</script>

<style lang="scss" global>
#command-bar {
  form {
    margin-bottom: 1rem;
  }

  input#command {
    width: 100%;
  }

  p#hint {
    height: 1rem;
    margin-top: 3px;
  }
}
</style>
