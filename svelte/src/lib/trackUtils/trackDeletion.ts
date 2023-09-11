import {
  appSettings,
  deleteTrack,
  logMessage,
  playingTrack,
  removeSelectedTracks,
  selectedTracks,
  stopPlayback,
  type Track,
} from '../../internal';

export async function deleteSelectedTracks(): Promise<void> {
  const selTracks: Track[] = selectedTracks.get();
  if (selTracks.length === 0) return;

  await Promise.all([
    removeSelectedTracks(),
    ...selTracks.map(
      (track: Track): Promise<void> => deleteTrackEverywhere(track)
    ),
  ]);
}

export async function deleteTrackEverywhere(track: Track): Promise<void> {
  // if this is the playing track stop playing it
  const pTrack: Track | null = playingTrack.get();

  if (pTrack != null && pTrack.id === track.id!) {
    stopPlayback();
  }

  if (track.rating != null) {
    throw Error(
      `Cannot delete rated track "${track.artist!}: ${track.title!}"`
    );
  } else {
    await deleteTrackFromS3(track.id!);
    await deleteTrack(track.id!);
    logMessage(`Deleted "${track.artist!}: ${track.title!}"`, 'success');
  }
}

async function deleteTrackFromS3(trackId: string): Promise<void> {
  const url: string = [appSettings.get().apiUrl, 'tracks', trackId].join('/');

  const res: Response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': appSettings.get().apiKey!,
    },
  });

  if (!res.ok) {
    throw Error(res.statusText);
  }
}
