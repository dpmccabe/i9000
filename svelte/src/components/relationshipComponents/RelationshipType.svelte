<div class="type">
  <span class="{relationship.type.toLowerCase().replace(/_/g, '-')}">
    {#if relationship.direction.toLowerCase() === 'backward'}
      &larr;
    {/if}
    {relationship.type.toLowerCase().replace(/_/g, ' ')}
    {#if relationship.direction.toLowerCase() === 'forward'}
      &rarr;
    {/if}
  </span>
</div>

<script lang="ts">
import { type Relationship } from '../../internal';

export let relationship: Relationship;
</script>
