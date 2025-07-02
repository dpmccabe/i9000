import { DateTime } from 'luxon';
import {
  activePane,
  allPlaylistName,
  cacheSelectedOrPlaylist,
  clearMp3Cache,
  type Command,
  createPlaylist,
  createPlaylistFolder,
  currentPlaylist,
  deletePlaylist,
  deletePlaylistFolder,
  getOrganizedPlaylists,
  id3Map,
  interleaveTracks,
  logMessage,
  organizedPlaylists,
  playingPlaylist,
  playingPlaylistId,
  type Playlist,
  type PlaylistFolder,
  playlists,
  refreshRobotPlaylists,
  renamePlaylist,
  renamePlaylistFolder,
  RetagOp,
  selectedTrackIds,
  selectedTracks,
  setCurrentPlaylist,
  stopPlayback,
  type TabSettingsQueryParam,
  titleCaseString,
  type Track,
  trackResults,
  type TrackSettings,
  trackSettings,
  uncacheMp3,
  updatePlaylistTracks,
  updatePlaylistTracksShuffle,
  updateTracks,
} from '../internal';
import { writable, type Writable } from './tansuStore';

/*******************************************************************************
 commands
 *******************************************************************************/

export const commandText: Writable<string> = writable('');
export const hintText: Writable<string> = writable('');

export const commands: Record<string, Command> = {
  np: {
    async handler(playlistName: string): Promise<void> {
      if (playlistName === '') {
        throw Error('Playlist name must not be blank');
      }

      let trackIds: string[] = [...selectedTrackIds.get()];

      if (trackIds.length === 1) {
        trackIds = [];
      }

      const createdPlaylist: Playlist = await createPlaylist(
        playlistName,
        trackIds
      );

      await setCurrentPlaylist(createdPlaylist.id);
      resetCommandBar();
    },

    hintTextBase: 'create playlist "<name>"',

    hinter(playlistName: string): void {
      if (playlistName === '') {
        hintText.set(this.hintTextBase);
      } else {
        hintText.set(`create playlist "${playlistName}"`);
      }
    },
  },

  dp: {
    async handler(playlistName: string): Promise<void> {
      if (playlistName === '') {
        throw Error('Playlist name must not be blank');
      } else if (playlistName === allPlaylistName) {
        throw Error('Cannot delete "All" playlist');
      }

      const playlistToDelete: Playlist | undefined = playlists
        .get()
        .find((p: Playlist): boolean => p.name === playlistName);

      if (playlistToDelete == null) {
        throw Error(`Playlist "${playlistName}" not found`);
      } else {
        if (playingPlaylist.get() === playlistToDelete) {
          stopPlayback();
        }

        const deletedPlaylistName: string = await deletePlaylist(
          playlistToDelete.id
        );

        organizedPlaylists.set(await getOrganizedPlaylists());

        if (currentPlaylist.get()?.name === playlistName) {
          trackSettings.update(
            (ts: TrackSettings | undefined): TrackSettings => {
              const queryParams = new Map<string, TabSettingsQueryParam>();
              queryParams.set('_playlistId', {
                gqlType: 'Int',
                value: null,
              });
              ts!.queryParams = queryParams;

              return ts!;
            }
          );
        }

        if (playingPlaylistId.get() === playlistToDelete.id) {
          stopPlayback();
        }

        logMessage(`Deleted playlist "${deletedPlaylistName}"`, 'success');
        resetCommandBar();
      }
    },

    hintTextBase: 'delete playlist "<name>"',

    hinter(playlistName: string): void {
      if (playlistName === '') {
        hintText.set(this.hintTextBase);
      } else {
        hintText.set(`delete playlist "${playlistName}"`);
      }
    },
  },

  rp: {
    async handler(arg: string): Promise<void> {
      const names: string[] = arg.split('/');

      if (
        names.length !== 2 ||
        names[0].length === 0 ||
        names[1].length === 0
      ) {
        throw Error('You must specify an old/new playlist name');
      } else if (names[0] === allPlaylistName) {
        throw Error('Cannot rename "All" playlist');
      }

      await renamePlaylist(names[0], names[1]);
      logMessage(`Renamed playlist "${names[0]}" to "${names[1]}"`, 'success');
      resetCommandBar();
    },

    hintTextBase: 'rename playlist "<name-1>/<name-2>"',

    hinter(arg: string): void {
      const names: string[] = arg.split('/');

      if (names.length === 2) {
        hintText.set(`rename playlist "${names[0]}/${names[1]}"`);
      } else {
        hintText.set(this.hintTextBase);
      }
    },
  },

  npf: {
    async handler(folderName: string): Promise<void> {
      if (folderName === '') {
        throw Error('Playlist folder name must not be blank');
      }

      const createdPlaylistFolder: PlaylistFolder = await createPlaylistFolder(
        folderName
      );

      organizedPlaylists.set(await getOrganizedPlaylists());

      logMessage(
        `Created playlist folder "${createdPlaylistFolder.name}"`,
        'success'
      );
      resetCommandBar();
    },

    hintTextBase: 'create playlist folder "<name>"',

    hinter(folderName: string): void {
      if (folderName === '') {
        hintText.set(this.hintTextBase);
      } else {
        hintText.set(`create playlist folder "${folderName}"`);
      }
    },
  },

  dpf: {
    async handler(folderName: string): Promise<void> {
      if (folderName === '') {
        throw Error('Playlist folder name must not be blank');
      }

      const folderToDelete: PlaylistFolder | undefined = organizedPlaylists
        .get()
        .playlistFolders.find(
          (pf: PlaylistFolder): boolean => pf.name === folderName
        );

      if (folderToDelete == null) {
        throw Error(`Playlist folder "${folderName}" not found`);
      } else {
        const deletedFolderName: string = await deletePlaylistFolder(
          folderToDelete.id
        );

        organizedPlaylists.set(await getOrganizedPlaylists());

        logMessage(`Deleted playlist folder "${deletedFolderName}"`, 'success');
        resetCommandBar();
      }
    },

    hintTextBase: 'delete playlist folder "<name>"',

    hinter(folderName: string): void {
      if (folderName === '') {
        hintText.set(this.hintTextBase);
      } else {
        hintText.set(`delete playlist folder "${folderName}"`);
      }
    },
  },

  rpf: {
    async handler(arg: string): Promise<void> {
      const names: string[] = arg.split('/');

      if (
        names.length !== 2 ||
        names[0].length === 0 ||
        names[1].length === 0
      ) {
        throw Error('You must specify an old/new playlist folder name');
      }

      await renamePlaylistFolder(names[0], names[1]);
      logMessage(
        `Renamed playlist folder "${names[0]}" to "${names[1]}"`,
        'success'
      );
      resetCommandBar();
    },

    hintTextBase: 'rename playlist folder "<name-1>/<name-2>"',

    hinter(arg: string): void {
      const names: string[] = arg.split(' ');

      if (names.length === 2) {
        hintText.set(`rename playlist folder "${names[0]}/${names[1]}"`);
      } else {
        hintText.set(this.hintTextBase);
      }
    },
  },

  sh: {
    async handler(): Promise<void> {
      const playlist: Playlist | undefined = currentPlaylist.get();
      if (playlist == null) return;

      if (playlist.name === allPlaylistName) {
        throw Error('Can\'t shuffle "All" playlist');
      } else {
        await updatePlaylistTracksShuffle(playlist, true);

        logMessage(`Shuffled tracks in playlist "${playlist.name}"`, 'success');
        resetCommandBar();
      }
    },

    hintTextBase: `shuffle tracks in current playlist`,

    hinter(): void {
      hintText.set(
        `shuffle tracks in playlist "${currentPlaylist.get()!.name}"`
      );
    },
  },

  int: {
    async handler(): Promise<void> {
      const playlist: Playlist | undefined = currentPlaylist.get();
      if (playlist == null) return;

      if (playlist.name === allPlaylistName) {
        throw Error('Can\'t interleave "All" playlist');
      } else {
        const tracks: Track[] = trackResults.get()!.results;
        const trackIds: string[] = interleaveTracks(tracks, 'album');
        await updatePlaylistTracks(playlist, trackIds, true);

        logMessage(
          `Interleaved tracks in playlist "${playlist.name}"`,
          'success'
        );

        resetCommandBar();
      }
    },

    hintTextBase: 'interleave tracks in current playlist',

    hinter(): void {
      hintText.set(
        `interleave tracks in playlist "${currentPlaylist.get()!.name}"`
      );
    },
  },

  ro: {
    async handler(nHoursIn: string): Promise<void> {
      let nHours: string;

      if (nHoursIn === '') {
        nHours = '8';
      } else {
        nHours = nHoursIn;
      }

      const pPlaylist: Playlist | null = playingPlaylist.get();

      if (pPlaylist?.name.match(/^P\s/)) stopPlayback();

      const nHoursInt: number = parseInt(nHours);

      if (nHoursInt < 0 || nHoursInt >= 100) {
        throw Error(`Can't generate ${nHoursInt} hours of tracks`);
      }

      const robotPlaylist: Playlist = await refreshRobotPlaylists(nHoursInt);

      await setCurrentPlaylist(robotPlaylist.id);

      logMessage(
        `Created robot playlist with duration ${nHours} hours`,
        'success'
      );
      resetCommandBar();
    },

    hintTextBase: 'create robot playlist with duration <nHours> hours',

    hinter(nHours: string): void {
      if (nHours === '') {
        hintText.set(this.hintTextBase);
      } else {
        hintText.set(`create robot playlist with duration ${nHours} hours`);
      }
    },
  },

  ca: {
    async handler(): Promise<void> {
      await cacheSelectedOrPlaylist();
      resetCommandBar();
    },

    hintTextBase: 'cache selected tracks or current playlist',

    hinter(): void {
      const selTrackIds: Set<string> = selectedTrackIds.get();

      if (selTrackIds.size > 0) {
        hintText.set(`cache ${selTrackIds.size} selected tracks`);
      } else {
        const playlist: Playlist | undefined = currentPlaylist.get();
        if (playlist == null) return;
        hintText.set(`cache all tracks in playlist "${playlist.name}"`);
      }
    },
  },

  uc: {
    async handler(): Promise<void> {
      const selTrackIds: Set<string> = selectedTrackIds.get();
      const tracks: Track[] = trackResults.get()!.results;

      if (selTrackIds.size > 0) {
        for (const trackId of selTrackIds) {
          const track: Track = tracks.find((t: Track): boolean => {
            return t.id === trackId;
          })!;
          await uncacheMp3(track);
        }
      } else {
        const playlist: Playlist | undefined = currentPlaylist.get();
        if (playlist == null) return;

        if (playlist.name === allPlaylistName) {
          throw Error('Can\'t uncache playlist "All"');
        } else {
          for (const t of tracks) {
            await uncacheMp3(t);
          }
        }
      }

      resetCommandBar();
    },

    hintTextBase: 'uncache selected tracks or current playlist',

    hinter(): void {
      const selTrackIds: Set<string> = selectedTrackIds.get();

      if (selTrackIds.size > 0) {
        hintText.set(`uncache ${selTrackIds.size} selected tracks`);
      } else {
        const playlist: Playlist | undefined = currentPlaylist.get();
        if (playlist == null) return;
        hintText.set(`uncache all tracks in playlist "${playlist.name}"`);
      }
    },
  },

  cc: {
    async handler(): Promise<void> {
      await clearMp3Cache();
      logMessage('Cleared mp3 cache', 'success');
      resetCommandBar();
    },

    hintTextBase: 'clear mp3 cache',

    hinter(): void {
      hintText.set(this.hintTextBase);
    },
  },

  alb: {
    async handler(): Promise<void> {
      await albumizeSelectedTracks();
      resetCommandBar();
    },

    hintTextBase: 'albumize selected tracks',

    hinter(): void {
      const selTrackIds: Set<string> = selectedTrackIds.get();

      if (selTrackIds.size > 0) {
        hintText.set(`albumize ${selTrackIds.size} selected tracks`);
      }
    },
  },

  cap: {
    async handler(): Promise<void> {
      resetCommandBar();
      await titleCaseTitles();
    },

    hintTextBase: 'properly capitalize titles of selected tracks',

    hinter(): void {
      const selTrackIds: Set<string> = selectedTrackIds.get();

      if (selTrackIds.size > 0) {
        hintText.set(
          `properly capitalize titles of ${selTrackIds.size} selected tracks`
        );
      }
    },
  }
};

export function resetCommandBar(): void {
  commandText.set('');
  hintText.set('');
  activePane.set('main');
}

export async function albumizeSelectedTracks(): Promise<void> {
  const sIds: string[] = [...selectedTrackIds.get()];
  if (sIds.length === 0) return;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const patch: Record<string, any>[] = [];

  for (let i = 0; i < sIds.length; i++) {
    patch.push({
      id: [...sIds][i],
      updatedAt: DateTime.now().toMillis(),
      trackI: i + 1,
      trackN: sIds.length,
    });

    new RetagOp(sIds[i], {
      [id3Map.trackI]: [i + 1, sIds.length].join('/'),
    });
  }

  await updateTracks(patch);
  trackSettings.touch();
}

export async function titleCaseTitles(): Promise<void> {
  const selTracks: Track[] = [...selectedTracks.get()];
  if (selTracks.length === 0) return;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const patch: Record<string, any>[] = [];

  for (const track of selTracks) {
    const fixedTitle: string = titleCaseString(track.title!);

    patch.push({
      id: track.id,
      updatedAt: DateTime.now().toMillis(),
      title: fixedTitle,
    });

    new RetagOp(track.id!, { [id3Map.title]: fixedTitle });
  }

  await updateTracks(patch);
  trackSettings.touch();
}
