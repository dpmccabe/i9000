import { tick } from 'svelte';
import { activePane, selectedTrackIds, view } from '../internal';

export async function viewAlbums(): Promise<void> {
  document.getElementById('view')!.scrollTop = 0;
  history.pushState('', '', '#albums');
  view.set('albums');
  await tick();
  activePane.set('main');
  document.getElementById('albums')?.focus();
}

export async function viewReleases(): Promise<void> {
  document.getElementById('view')!.scrollTop = 0;
  history.pushState('', '', '#releases');
  view.set('releases');
  await tick();
  activePane.set('main');
  document.getElementById('releases')?.focus();
}

export function prepEditTags(): void {
  const sIds: Set<string> = selectedTrackIds.get();
  if (sIds.size === 0) return;

  activePane.set('tag-editor');
}

export function prepParseTitles(): void {
  const sIds: Set<string> = selectedTrackIds.get();
  if (sIds.size === 0) return;

  activePane.set('title-parser');
}

export function prepSearchReplace(): void {
  const sIds: Set<string> = selectedTrackIds.get();
  if (sIds.size === 0) return;

  activePane.set('search-replace');
}

export function prepThisThat(): void {
  const sIds: Set<string> = selectedTrackIds.get();
  if (sIds.size === 0) return;

  activePane.set('this-that');
}
