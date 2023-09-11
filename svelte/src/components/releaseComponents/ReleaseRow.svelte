<tr id="{`release-${rix}`}">
  {#if $narrow}
    <td>
      <div class="fields">
        <dl>
          {#each Object.keys(releaseFields) as field}
            {#if releaseFields[field].mobileDisplayed && field !== 'ackstate' && row[field] != null}
              <dt>{releaseFields[field].displayName}</dt>
              <dd>
                {#if field === 'artistNames'}
                  <ReleaseArtists release="{row}" />
                {:else if field === 'title'}
                  <ReleaseTitle release="{row}" />
                {:else if field === 'types'}
                  <ReleaseTypes release="{row}" />
                {:else if row[field] != null}{formattedField(field)}{/if}
              </dd>
            {/if}
          {/each}
        </dl>
      </div>

      <div class="actions">
        <Ackstate release="{row}" />
      </div>
    </td>
  {:else}
    {#each Object.keys(releaseFields) as field}
      {#if releaseFields[field].displayed}
        <td
          class="{camelToKebabCase(field)}"
          class:truncatable="{releaseFields[field].truncatable}"
          class:numeric="{releaseFields[field].numeric}">
          {#if field === 'ackstate'}
            <Ackstate release="{row}" />
          {:else if field === 'artistNames'}
            <ReleaseArtists release="{row}" />
          {:else if field === 'title'}
            <ReleaseTitle release="{row}" />
          {:else if field === 'types'}
            <ReleaseTypes release="{row}" />
          {:else if row[field] != null}{formattedField(field)}{/if}
        </td>
      {/if}
    {/each}
  {/if}
</tr>

<script lang="ts">
import {
  camelToKebabCase,
  narrow,
  type Release,
  releaseFields,
} from '../../internal';
import Ackstate from './Ackstate.svelte';
import ReleaseArtists from './ReleaseArtists.svelte';
import ReleaseTitle from './ReleaseTitle.svelte';
import ReleaseTypes from './ReleaseTypes.svelte';

export let row: Release;
export let rix: number;

function formattedField(field: string): string {
  return releaseFields[field].formatter == null
    ? (row[field] as string)
    : releaseFields[field].formatter(row[field]);
}
</script>
