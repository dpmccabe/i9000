<span>
  <a
    href="{['https://musicbrainz.org/release-group', release.id].join('/')}"
    target="_blank"
    rel="noreferrer">{release.title}</a>

  <a href="#top" on:click|preventDefault="{copyReleaseToClipBoard}" class="copy"
    ><Fa icon="{faCopy}" /></a>
</span>

<script lang="ts">
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import { type Release } from '../../internal';

export let release: Release;

function copyReleaseToClipBoard(): void {
  let releaseText: string = [release.artists[0].name, release.title].join(' ');
  releaseText = releaseText
    .replaceAll(/[,.:;'"/?[\]()&!]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .toLowerCase();

  const tokens = new Set<string>(releaseText.split(' '));
  const removeTokens = new Set<string>([
    ...'a',
    'an',
    'the',
    'of',
    'to',
    'from',
    'with',
    'on',
    'and',
    'for',
    'i',
    'ep',
  ]);

  for (const t of removeTokens) {
    tokens.delete(t);
  }

  releaseText = [...tokens].join(' ');
  void navigator.clipboard.writeText(releaseText);
}
</script>
