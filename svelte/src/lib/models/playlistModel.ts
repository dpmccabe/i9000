/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return
*/
import { db, type Playlist } from '../../internal';

export async function getPlaylist(id: number): Promise<Playlist> {
  const q = `
    query getPlaylist($id: Int!) {
      playlist(id: $id) {
        id
        ix
        name
        sortAsc
        sortCol
      }
    }
  `;

  const res: any = await db(q, { id: id });
  return res.playlist;
}

export async function postPlaylist(name: string): Promise<Playlist> {
  const q = `
    mutation postPlaylist($name: String!) {
      createPlaylist(input: { playlist: { name: $name } }) {
        playlist {
          id
          name
          sortAsc
          sortCol
          ix
        }
      }
    }
  `;

  const res: any = await db(q, { name: name });
  return res.createPlaylist.playlist;
}

export async function putPlaylist(playlist: Playlist): Promise<Playlist> {
  const q = `
    mutation putPlaylist(
      $id: Int!
      $name: String!
      $sortCol: String!
      $sortAsc: Boolean!
      $ix: Int!
    ) {
      updatePlaylist(
        input: {
          id: $id
          patch: { name: $name, sortCol: $sortCol, sortAsc: $sortAsc, ix: $ix }
        }
      ) {
        playlist {
          id
          name
          sortAsc
          sortCol
          ix
        }
      }
    }
  `;

  const res: any = await db(q, playlist);

  return res.updatePlaylist.playlist;
}

export async function updatePlaylists(
  patch: Record<string, any>[]
): Promise<void> {
  const q = `
    mutation updatePlaylists($mnPatch: [PlaylistPatch!]) {
      mnUpdatePlaylist(input: { mnPatch: $mnPatch }) {
        clientMutationId
      }
    }
  `;

  await db(q, { mnPatch: patch });
}

export async function deletePlaylist(id: number): Promise<string> {
  const q = `
    mutation deletePlaylist($id: Int!) {
      deletePlaylist(input: { id: $id }) {
        playlist {
          name
        }
      }
    }
  `;

  const res: any = await db(q, { id: id });
  return res.deletePlaylist.playlist.name;
}
