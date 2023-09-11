<div id="auth">
  <form on:submit|preventDefault="{() => logIn()}" action="#">
    <label
      ><input
        required
        type="text"
        autocapitalize="off"
        autocomplete="email"
        name="username"
        bind:this="{username}"
        placeholder="username" /></label>
    <label
      ><input
        required
        type="password"
        name="password"
        autocomplete="current-password"
        bind:this="{password}"
        placeholder="password" /></label>

    <button type="submit" disabled="{working}" class:working="{working}"
      >Log in
      <Fa icon="{faSpinner}" size="sm" spin /></button>
  </form>
</div>

<script lang="ts">
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { onMount } from 'svelte';
import Fa from 'svelte-fa/src/fa.svelte';
import { logInToApi } from '../internal';

let username: HTMLInputElement;
let password: HTMLInputElement;
let working = false;

onMount((): void => {
  username.focus();
});

async function logIn(): Promise<void> {
  working = true;
  await logInToApi(username.value, password.value);
  working = false;
}
</script>

<style lang="scss" global>
@use '../assets/dims';

#auth {
  width: 300px;
  max-width: 100%;
  margin: 1rem auto;

  @media screen and (max-width: dims.$mobile-cutoff) {
    width: 100%;
    margin: 0;
    padding: 1rem;
  }

  label {
    display: block;

    input {
      width: 100%;
    }
  }

  label + label {
    margin-top: 4px;
  }

  button[type='submit'] {
    margin: 1rem auto 0 auto;
  }
}
</style>
