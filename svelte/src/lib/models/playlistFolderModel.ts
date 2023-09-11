/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return
*/
import {
  db,
  type OrganizedPlaylists,
  type PlaylistFolder,
} from '../../internal';

export async function getOrganizedPlaylists(): Promise<OrganizedPlaylists> {
  const q = `
    query playlistFoldersAndNakedPlaylists {
      playlistFolders(orderBy: IX_ASC) {
        nodes {
          id
          ix
          name
          
          playlists(orderBy: IX_ASC) {
            nodes {
              id
              name
              sortAsc
              sortCol
              ix
            }
          }
        }
      }

      nakedPlaylists: playlists(
        orderBy: IX_ASC
        filter: { playlistFolderExists: false }
      ) {
        nodes {
          id
          name
          sortAsc
          sortCol
          ix
        }
      }
    }
  `;

  const res: any = await db(q, {});

  return {
    playlistFolders: res.playlistFolders.nodes.map(
      (r: Record<string, any>): PlaylistFolder => {
        return {
          id: r.id,
          name: r.name,
          ix: r.ix,
          playlists: r.playlists.nodes,
        };
      }
    ),
    nakedPlaylists: res.nakedPlaylists.nodes,
  };
}

export async function createPlaylistFolder(
  name: string
): Promise<PlaylistFolder> {
  const q = `
    mutation postPlaylistFolder($name: String!) {
      createPlaylistFolder(input: { playlistFolder: { name: $name } }) {
        playlistFolder {
          id
          name
          ix
        }
      }
    }
  `;

  const res: any = await db(q, { name: name });
  return res.createPlaylistFolder.playlistFolder;
}

export async function putPlaylistFolder(
  playlist: PlaylistFolder
): Promise<PlaylistFolder> {
  const q = `
    mutation putPlaylistFolder($id: Int!, $name: String!, $ix: Int!) {
      updatePlaylistFolder(
        input: { id: $id, patch: { name: $name, ix: $ix } }
      ) {
        playlistFolder {
          id
          name
          ix
        }
      }
    }
  `;

  const res: any = await db(q, playlist);
  return res.updatePlaylistFolder.playlistFolder;
}

export async function updatePlaylistFolders(
  patch: Record<string, any>[]
): Promise<void> {
  const q = `
    mutation updatePlaylistFolders($mnPatch: [PlaylistFolderPatch!]) {
      mnUpdatePlaylistFolder(input: { mnPatch: $mnPatch }) {
        clientMutationId
      }
    }
  `;

  await db(q, { mnPatch: patch });
}

export async function deletePlaylistFolder(id: number): Promise<string> {
  const q = `
    mutation deletePlaylistFolder($id: Int!) {
      deletePlaylistFolder(input: { id: $id }) {
        playlistFolder {
          name
        }
      }
    }
  `;

  const res: any = await db(q, { id: id });
  return res.deletePlaylistFolder.playlistFolder.name;
}
