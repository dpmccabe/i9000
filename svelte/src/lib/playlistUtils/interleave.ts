import {
  groupTracks,
  objHas,
  shuffle,
  type Track,
  type TrackGroup,
} from '../../internal';

export function interleaveGroupedTracks(
  trackGroups: TrackGroup[][]
): TrackGroup[] {
  const trackGroupsShuffled: TrackGroup[][] = trackGroups.map(
    (x: TrackGroup[]): TrackGroup[] => assignRandomOrdinals(x)
  );

  // collapse into genre-cats
  const gcTrackGroups: Record<string, TrackGroup[]> =
    trackGroupsShuffled.reduce(
      (
        acc: Record<string, TrackGroup[]>,
        tg: TrackGroup[]
      ): Record<string, TrackGroup[]> => {
        const genreCat: string = tg[0].genreCat;

        if (genreCat in acc) {
          acc[genreCat] = acc[genreCat].concat(tg);
        } else {
          acc[genreCat] = tg;
        }

        return acc;
      },
      {}
    );

  // sort within genre-cat and assign final sort value
  for (const gc in gcTrackGroups) {
    if (objHas(gcTrackGroups, gc)) {
      // sort by j
      gcTrackGroups[gc] = gcTrackGroups[gc].sort(
        (x: TrackGroup, y: TrackGroup): number => {
          return x.j! - y.j!;
        }
      );

      // assign sort value to first record (since we're using a lag)
      gcTrackGroups[gc][0].b1 = 0;
      gcTrackGroups[gc][0].b2 = 1 / (gcTrackGroups[gc].length + 1);
      gcTrackGroups[gc][0].b =
        (gcTrackGroups[gc][0].b1! + gcTrackGroups[gc][0].b2!) / 2;

      // use midpoint of lagged and current
      for (let i = 1; i < gcTrackGroups[gc].length; i++) {
        gcTrackGroups[gc][i].b1 = gcTrackGroups[gc][i - 1].b2;
        gcTrackGroups[gc][i].b2 = (i + 1) / (gcTrackGroups[gc].length + 1);
        gcTrackGroups[gc][i].b =
          (gcTrackGroups[gc][i].b1! + gcTrackGroups[gc][i].b2!) / 2;
      }
    }
  }

  // combine all unique groups and sort
  const flatTrackGroupsSorted: TrackGroup[] = Object.values(
    gcTrackGroups
  ).reduce((acc: TrackGroup[], x: TrackGroup[]): TrackGroup[] => acc.concat(x));

  flatTrackGroupsSorted.sort((x: TrackGroup, y: TrackGroup): number => {
    return x.b! - y.b!;
  });

  return flatTrackGroupsSorted;
}

export function interleaveTracks(
  tracks: Track[],
  by: 'grouping' | 'album'
): string[] {
  // collect in genreCat groups
  const gcTracks: Record<string, Track[]> = tracks.reduce(
    (acc: Record<string, Track[]>, track: Track): Record<string, Track[]> => {
      if (track.genreCat! in acc) {
        acc[track.genreCat!].push(track);
      } else {
        acc[track.genreCat!] = [track];
      }

      return acc;
    },
    {}
  );

  // within each genreCat, sort by grouping then within grouping
  Object.keys(gcTracks).forEach((gcr: string): void => {
    gcTracks[gcr].sort((x: Track, y: Track): number => {
      if (objHas(x, by) && objHas(y, by)) {
        if (x[by] === y[by]) {
          return x.trackI! < y.trackI! ? -1 : 1;
        } else {
          return x[by]! < y[by]! ? -1 : 1;
        }
      } else if (objHas(x, by)) {
        return -1;
      } else if (objHas(y, by)) {
        return 1;
      } else {
        return x.id! < y.id! ? -1 : 1;
      }
    });
  });

  // within each gcr, aggregate by groupings
  const gcTrackGroups: TrackGroup[][] = Object.values(gcTracks).map(
    (tracks: Track[]): TrackGroup[] => {
      return groupTracks(tracks, tracks[0].genreCat!, by);
    }
  );

  const interleavedTrackGroups: TrackGroup[] =
    interleaveGroupedTracks(gcTrackGroups);

  // collect track IDs
  return interleavedTrackGroups.reduce(
    (acc: string[], tg: TrackGroup): string[] => {
      return acc.concat(tg.tracks.map((t: Track): string => t.id!));
    },
    []
  );
}

function assignRandomOrdinals(trackGroup: TrackGroup[]): TrackGroup[] {
  shuffle(trackGroup);

  // add some noise to each to prevent interleaving "collisions" later
  const maxRand: number = 1 / (trackGroup.length + 1);
  const noise: number = Math.random() * maxRand;

  // assign a noisy, equally-spaced number between (0, 1) to each track group
  for (let i = 0; i < trackGroup.length; i++) {
    trackGroup[i].j = (i + 1) / (trackGroup.length + 1) - noise;
  }

  return trackGroup;
}
