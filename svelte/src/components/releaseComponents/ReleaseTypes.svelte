<div class="types">
  {#each release.types as typ}
    <span class="{typ.toLowerCase().replace(/\//, '-')}">{typ}</span>
  {/each}
</div>

<script lang="ts">
import { type Release } from '../../internal';

export let release: Release;
</script>
