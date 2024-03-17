<tr id="{`play-${rix}`}" class="{camelToKebabCase(row.track.genreColor ?? '')}">
  {#if $narrow}
    <td>
      <div class="fields">
        <dl>
          {#each Object.keys(playFields) as field}
            {@const fieldValue = getFieldValue(row, field)}
            {#if playFields[field].mobileDisplayed && fieldValue != null}
              <dt class="{field}">{playFields[field].displayName}</dt>
              <dd
                class="{field}"
                class:truncatable="{playFields[field].truncatable}">
                {fieldValue}
              </dd>
            {/if}
          {/each}
        </dl>
      </div>

      <div class="actions">
        <a
          role="button"
          href="#top"
          on:click|stopPropagation="{async () => {
            await deletePlay(row.id);
            playSettings.touch();
          }}">
          <Fa icon="{faDeleteLeft}" fw size="2x" />
        </a>
      </div>
    </td>
  {:else}
    {#each Object.keys(playFields) as field}
      {#if playFields[field].displayed}
      {@const fieldValue = getFieldValue(row, field)}
        <td
          class="{camelToKebabCase(field)}"
          class:truncatable="{playFields[field].truncatable}"
          class:numeric="{playFields[field].numeric}">
          {#if field === 'delete'}
            <a
              role="button"
              href="#top"
              on:click|stopPropagation="{async () => {
                await deletePlay(row.id);
                playSettings.touch();
              }}">
              <Fa icon="{faDeleteLeft}" fw size="2x" />
            </a>
          {:else if fieldValue != null}{fieldValue}{/if}
        </td>
      {/if}
    {/each}
  {/if}
</tr>

<script lang="ts">
import {
  type Play,
  playFields,
  playSettings,
  camelToKebabCase,
  narrow,
  deletePlay,
} from '../../internal';
import { faDeleteLeft } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';

export let row: Play;
export let rix: number;

function getFieldValue(row: Play, field: string): string {
  let fv: any;

  if (field.startsWith('track.')) {
    const trackField: string = field.substring(6);
    fv = row.track[trackField];
  } else {
    fv = row[field];
  }

  if (playFields[field].formatter == null) {
    return fv as string;
  } else {
    return playFields[field].formatter(fv);
  }
}
</script>
