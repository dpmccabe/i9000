<div
  id="{id}"
  class="autosized-text"
  style="max-height: {maxHeightPx}px; line-height: {lineHeight}; font-size: {fontSizePx}px;">
  <div bind:this="{el}">
    <slot />
  </div>
</div>

<script lang="ts">
import { afterUpdate, tick } from 'svelte';

export let id: string;
export let lineHeight: string;
export let maxHeightPx: number;
export let minFontSizePx = 5;
export let maxFontSizePx = 40;
let fontSizePx: number;
let el: HTMLElement;

$: {
  fontSizePx = maxFontSizePx;
}

afterUpdate(async (): Promise<void> => {
  await tick();

  if (el.clientHeight > maxHeightPx && fontSizePx > minFontSizePx) {
    fontSizePx--;
  }
});
</script>
