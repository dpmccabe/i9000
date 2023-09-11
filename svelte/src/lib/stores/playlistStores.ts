import {
  type OrganizedPlaylists,
  type Playlist,
  trackSettings,
  type TrackSettings,
} from '../../internal';
import { derived, type Readable, writable, type Writable } from '../tansuStore';

export const allPlaylistName = 'Songs';
export const allPlaylist: Writable<Playlist | null> = writable(null);
export const organizedPlaylists: Writable<OrganizedPlaylists> = writable({
  playlistFolders: [],
  nakedPlaylists: [],
});
export const playlists: Writable<Playlist[]> = writable([]);
export const playlistTracksHistoryIds: Writable<number[]> = writable([]);
export const currentPlaylistTracksHistoryId: Writable<number | null> =
  writable(null);
export const playlistQuickSelectText: Writable<string> = writable('');
export const playlistQuickSelectPos: Writable<number> = writable(0);
export const playlistQuickSelectMatches: Writable<Playlist[]> = writable([]);

export const currentPlaylist: Readable<Playlist | undefined> = derived(
  trackSettings,
  (theTrackSettings: TrackSettings | undefined): Playlist | undefined => {
    const playlistId: number | null =
      theTrackSettings?.queryParams.get('_playlistId')!.value;

    if (playlistId == null) return undefined;

    return playlists.get().find((p: Playlist): boolean => p.id === playlistId);
  },
  undefined
);
