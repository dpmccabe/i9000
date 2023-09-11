import {
  type TabResults,
  type Track,
  type TrackSettings,
} from '../../internal';
import { type Writable, writable } from '../tansuStore';

export const trackSettings: Writable<TrackSettings | undefined> = writable<
  TrackSettings | undefined
>(undefined);

export const trackResults: Writable<TabResults<Track> | undefined> = writable<
  TabResults<Track> | undefined
>(undefined);

export const tracksAreReorderable: Writable<boolean> = writable(false);
export const cachedTrackIds: Writable<Set<string>> = writable(new Set());
export const selectedTrackIds: Writable<Set<string>> = writable(
  new Set<string>()
);
export const selectedTracks: Writable<Track[]> = writable([]);
export const selectedTrackIdsInOrder: Writable<string[]> = writable([]);
export const nTracksSelected: Writable<number> = writable(0);
export const multiSelecting: Writable<boolean> = writable(false);
export const pivotRow: Writable<number | null> = writable(null);
export const selectingRow: Writable<number | null> = writable(null);
export const tracksClipboard: Writable<string[]> = writable([]);
export const cutOrCopy: Writable<'cut' | 'copy' | null> = writable(null);
export const cutOrCopyFromPlaylistId: Writable<number | null> = writable(null);
