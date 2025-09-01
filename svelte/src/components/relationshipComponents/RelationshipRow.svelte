<tr id="{`relationship-${rix}`}">
  {#if $narrow}
    <td>
      <div class="fields">
        <dl>
          {#each Object.keys(relationshipFields) as field}
            {#if relationshipFields[field].mobileDisplayed && field !== 'acked' && row[field] != null}
              <dt>{relationshipFields[field].displayName}</dt>
              <dd>
                {#if field === 'artist'}
                  <RelationshipArtist artist="{row.artist}" />
                {:else if field === 'type'}
                  <RelationshipType relationship="{row}" />
                {:else if field === 'otherArtist'}
                  <RelationshipArtist artist="{row.otherArtist}" />
                {:else if row[field] != null}{formattedField(field)}{/if}
              </dd>
            {/if}
          {/each}
        </dl>
      </div>

      <div class="actions">
        <Ack relationship="{row}" />
      </div>
    </td>
  {:else}
    {#each Object.keys(relationshipFields) as field}
      {#if relationshipFields[field].displayed}
        <td
          class="{camelToKebabCase(field)}"
          class:truncatable="{relationshipFields[field].truncatable}"
          class:numeric="{relationshipFields[field].numeric}">
          {#if field === 'acked'}
            <Ack relationship="{row}" />
          {:else if field === 'artist'}
            <RelationshipArtist artist="{row.artist}" />
          {:else if field === 'type'}
            <RelationshipType relationship="{row}" />
          {:else if field === 'otherArtist'}
            <RelationshipArtist artist="{row.otherArtist}" />
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
  type Relationship,
  relationshipFields,
} from '../../internal';
import Ack from './Ack.svelte';
import RelationshipArtist from './RelationshipArtist.svelte';
import RelationshipType from './RelationshipType.svelte';
import RelationshipDirection from './RelationshipDirection.svelte';

export let row: Relationship;
export let rix: number;

function formattedField(field: string): string {
  return relationshipFields[field].formatter == null
    ? (row[field] as string)
    : relationshipFields[field].formatter(row[field]);
}
</script>
