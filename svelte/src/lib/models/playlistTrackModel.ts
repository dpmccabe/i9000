/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return
*/
import { db, type PlaylistTrack } from '../../internal';

export async function getPlaylistTrackIds(
  playlistId: number
): Promise<Set<string>> {
  const q = `
    query getPlaylistTrackIds($playlistId: Int!) {
      playlistTracks(condition: { playlistId: $playlistId }, orderBy: IX_ASC) {
        nodes {
          trackId
        }
      }
    }
  `;

  const res: any = await db(q, { playlistId: playlistId });

  return new Set(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    res.playlistTracks.nodes.map((r: Record<string, any>): string => {
      return r.trackId;
    })
  );
}

export async function shufflePlaylist(
  playlistId: number,
  currentHistoryId: number | null,
  pushHistory = false
): Promise<number[] | undefined> {
  const mutArgs: string[] = ['$playlistId: Int!'];

  let maybePushHistory: string;

  if (pushHistory) {
    mutArgs.push('$currentHistoryId: Int');

    maybePushHistory = `
      pushPlaylistTracksHistory(
        input: {
          _playlistId: $playlistId,
          _currentHistoryId: $currentHistoryId
        }
      ) {
        integers
      }
    `;
  } else {
    maybePushHistory = `
      clearPlaylistTracksHistory(input: {}) {
        clientMutationId
      }
    `;
  }

  const q = `
    mutation shufflePlaylist(${mutArgs.join('\n')}) {
      ${maybePushHistory}
      
      shufflePlaylist(input: { _playlistId: $playlistId }) {
        clientMutationId
      }
    }
  `;

  const params: Record<string, any> = { playlistId: playlistId };

  if (pushHistory) {
    params.currentHistoryId = currentHistoryId;
    const res: any = await db(q, params);
    return res.pushPlaylistTracksHistory.integers;
  } else {
    await db(q, params);
    return;
  }
}

export async function insertPlaylistTracks(
  playlistTracks: PlaylistTrack[],
  currentHistoryId: number | null,
  pushHistory = false,
  emptyFirst = false
): Promise<number[] | undefined> {
  const mutArgs: string[] = [
    '$playlistTracks: [PlaylistTrackInput]!',
    '$playlistId: Int!',
  ];

  let maybePushHistory: string;

  if (pushHistory) {
    mutArgs.push('$currentHistoryId: Int');

    maybePushHistory = `
      pushPlaylistTracksHistory(
        input: {
          _playlistId: $playlistId,
          _currentHistoryId: $currentHistoryId
        }
      ) {
        integers
      }
    `;
  } else {
    maybePushHistory = `
      clearPlaylistTracksHistory(input: {}) {
        clientMutationId
      }
    `;
  }

  let maybeEmpty = '';

  if (emptyFirst) {
    maybeEmpty = `
      emptyPlaylist(input: { _playlistId: $playlistId }) {
        clientMutationId
      }
    `;
  }

  const q = `
    mutation insertPlaylistTracks(${mutArgs.join('\n')}) {
      ${maybePushHistory}

      ${maybeEmpty}
      
      createPlaylistTracks(input: { _playlistTracks: $playlistTracks }) {
        clientMutationId
      }

      reixPlaylist(input: { _playlistId: $playlistId }) {
        clientMutationId

        query {
          playlistTracks(
            condition: { playlistId: $playlistId }
            orderBy: IX_ASC
          ) {
            nodes {
              trackId
            }
          }
        }
      }
    }
  `;

  const params: Record<string, any> = {
    playlistTracks: playlistTracks,
    playlistId: playlistTracks[0].playlistId,
  };

  if (pushHistory) {
    params.currentHistoryId = currentHistoryId;
    const res: any = await db(q, params);
    return res.pushPlaylistTracksHistory.integers;
  } else {
    await db(q, params);
    return;
  }
}

export async function deletePlaylistTracks(
  playlistId: number,
  trackIds: Set<string>,
  pushHistory = false,
  currentHistoryId: number | null = null
): Promise<number[]> {
  let maybePushHistory: string;

  if (pushHistory) {
    maybePushHistory = `
      pushPlaylistTracksHistory(
        input: {
          _playlistId: $playlistId,
          _currentHistoryId: $currentHistoryId
        }
      ) {
        integers
      }
    `;
  } else {
    maybePushHistory = `
      clearPlaylistTracksHistory(input: {}) {
        clientMutationId
      }
    `;
  }

  const q = `
    mutation deletePlaylistTracks(
      $playlistId: Int!,
      $trackIds: [String!]
      $currentHistoryId: Int
    ) {
      ${maybePushHistory}

      deletePlaylistTracks(
        input: { _playlistId: $playlistId, _trackIds: $trackIds }
      ) {
        clientMutationId
      }

      reixPlaylist(input: { _playlistId: $playlistId }) {
        clientMutationId
      }
    }
  `;

  const params: Record<string, any> = {
    playlistId: playlistId,
    trackIds: [...trackIds],
  };

  if (pushHistory) params.currentHistoryId = currentHistoryId;

  const res: any = await db(q, params);

  return res.pushPlaylistTracksHistory.integers;
}

export async function restoreFromPlaylistTracksHistory(
  historyId: number
): Promise<number> {
  const q = `
    mutation restoreFromPlaylistTracksHistory($historyId: Int!) {
      restoreFromPlaylistTracksHistory(input: { _historyId: $historyId }) {
        integers
      }
    }
  `;

  const res: any = await db(q, { historyId: historyId });

  return res.restoreFromPlaylistTracksHistory.integers[0];
}

export async function clearPlaylistTracksHistory(): Promise<void> {
  const q = `
    mutation clearPlaylistTracksHistory {
      clearPlaylistTracksHistory(input: {}) {
        clientMutationId
      }
    }
  `;

  await db(q, {});
}
