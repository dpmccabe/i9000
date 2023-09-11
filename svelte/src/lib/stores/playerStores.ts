import { type Track, type Playlist } from '../../internal';
import { writable, type Writable } from '../tansuStore';

export const playQueue: Writable<Track[]> = writable([]);
export const queuePosition: Writable<[number, number] | null> = writable(null);
export const canPlayPrev: Writable<boolean> = writable(false);
export const canPlayNext: Writable<boolean> = writable(false);
export const playingTrack: Writable<Track | null> = writable(null);
export const audioElement: Writable<HTMLAudioElement | null> = writable(null);
export const loadingNextAudioElement: Writable<boolean> = writable(false);
export const nextAudioElement: Writable<HTMLAudioElement | null> =
  writable(null);
export const currentTime: Writable<number | null> = writable(null);
export const duration: Writable<number | null> = writable(null);
export const paused: Writable<boolean | null> = writable(null);
export const markCheckFn: Writable<number | null> = writable(null);
export const markedPlayed: Writable<boolean> = writable(false);
export const playingPlaylistId: Writable<number | null> = writable(null);
export const playingPlaylist: Writable<Playlist | null> = writable(null);
export const mediaHandlersSet: Writable<boolean> = writable(false);
