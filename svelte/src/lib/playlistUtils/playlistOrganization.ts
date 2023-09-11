import {
  allPlaylist,
  allPlaylistName,
  getOrganizedPlaylists,
  type OrganizedPlaylists,
  organizedPlaylists,
  playingPlaylist,
  playingPlaylistId,
  type Playlist,
  type PlaylistFolder,
  playlists,
  postPlaylist,
  putPlaylist,
  putPlaylistFolder,
  updatePlaylistFolders,
  updatePlaylists,
  updatePlaylistTracks,
} from '../../internal';

export async function createPlaylist(
  playlistName: string,
  trackIds: string[]
): Promise<Playlist> {
  const existingPlaylist: Playlist | undefined = playlists
    .get()
    .find((p: Playlist): boolean => p.name === playlistName);

  if (existingPlaylist != null) {
    throw Error(`Playlist "${playlistName}" exists`);
  }

  const createdPlaylist: Playlist = await postPlaylist(playlistName);

  if (trackIds.length > 0) {
    await updatePlaylistTracks(createdPlaylist, trackIds, false);
  }

  organizedPlaylists.set(await getOrganizedPlaylists());

  return createdPlaylist;
}

export async function renamePlaylist(
  oldName: string,
  newName: string
): Promise<void> {
  const playlist: Playlist | undefined = playlists
    .get()
    .find((p: Playlist): boolean => p.name === oldName);

  if (playlist == null) {
    throw Error(`Playlist ${oldName} does not exist`);
  }

  playlist.name = newName;
  await putPlaylist(playlist);

  organizedPlaylists.set(await getOrganizedPlaylists());

  const pPlaylist: Playlist | null = playingPlaylist.get();

  if (pPlaylist != null && pPlaylist.id === playlist.id) {
    playingPlaylistId.set(playlist.id);
  }
}

export async function renamePlaylistFolder(
  oldName: string,
  newName: string
): Promise<void> {
  const playlistFolder: PlaylistFolder | undefined = organizedPlaylists
    .get()
    .playlistFolders.find((pf: PlaylistFolder): boolean => pf.name === oldName);

  if (playlistFolder == null) {
    throw Error(`Playlist folder ${oldName} does not exist`);
  }

  playlistFolder.name = newName;
  await putPlaylistFolder(playlistFolder);

  organizedPlaylists.set(await getOrganizedPlaylists());
}

export async function setPlaylistsOrganization(
  foldersPatch: { id: number; ix: number }[],
  playlistsPatch: {
    id: number;
    playlistFolderId: number | null;
    ix: number;
  }[]
): Promise<void> {
  await Promise.all([
    updatePlaylistFolders(foldersPatch),
    updatePlaylists(playlistsPatch),
  ]);

  organizedPlaylists.set(await getOrganizedPlaylists());
}

organizedPlaylists.subscribe(
  ($organizedPlaylists: OrganizedPlaylists): void => {
    const flatPlaylists: Playlist[] = [];
    let theAllPlaylist: Playlist | undefined = undefined;

    for (const p of $organizedPlaylists.nakedPlaylists) {
      flatPlaylists.push(p);

      if (theAllPlaylist == null && p.name === allPlaylistName) {
        theAllPlaylist = p;
      }
    }

    for (const f of $organizedPlaylists.playlistFolders) {
      if (f.playlists == null) continue;

      for (const p of f.playlists) {
        flatPlaylists.push(p);

        if (theAllPlaylist == null && p.name === allPlaylistName) {
          theAllPlaylist = p;
        }
      }
    }

    playlists.set(flatPlaylists);
    allPlaylist.set(theAllPlaylist!);
  }
);
