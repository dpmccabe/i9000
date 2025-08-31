import type { DateTime } from 'luxon';
import {
  createPlaylist,
  type GcrDuration,
  getStarredTracks,
  groupTracks,
  interleaveGroupedTracks,
  narrow,
  objHas,
  type Playlist,
  playlists,
  type RobotIds,
  robotSettings,
  type Track,
  type TrackGroup,
  updatePlaylistTracks,
} from '../../internal';

const genreCatNames: string[] = Object.keys(robotSettings.genreCats);

function calcIdealGcrDurations(
  gcrTotalDurations: GcrDuration[],
  nHours: number
): GcrDuration[] {
  // calculate total duration of entire pool
  const grandTotalDuration: number = gcrTotalDurations
    .map((x: GcrDuration): number => x.duration!)
    .reduce((acc: number, x: number): number => acc + x);

  // calculate empirical proportion of gcr pairs in pool
  gcrTotalDurations.forEach((x: GcrDuration): void => {
    x.prop = x.duration! / grandTotalDuration;
  });

  // aggregate total proportions across genreCats
  const genreCatProps: Record<string, number> = gcrTotalDurations.reduce(
    (acc: Record<string, number>, x: GcrDuration): Record<string, number> => {
      if (objHas(acc, x.genreCat)) {
        acc[x.genreCat] += x.prop!;
      } else {
        acc[x.genreCat] = x.prop!;
      }

      return acc;
    },
    {}
  );

  // preferred proportion of genres in final playlist
  const genreCatMults: Record<string, number> = genreCatNames.reduce(
    (acc: Record<string, number>, gc: string): Record<string, number> => {
      acc[gc] = robotSettings.genreCats[gc].prop;
      return acc;
    },
    {}
  );

  // calculate needed sampling multiplier to get empirical genreCat proportions
  // to match preferred proportions
  Object.keys(genreCatMults).forEach((gc: string): void => {
    genreCatMults[gc] /= genreCatProps[gc];
  });

  const minGenreCatMults: number = Math.min(...Object.values(genreCatMults));

  // normalize multipliers
  Object.keys(genreCatMults).forEach((gc: string): void => {
    genreCatMults[gc] /= minGenreCatMults;
  });

  // calculate final multipliers for genreCat-rating groups
  const gcrMults: GcrDuration[] = [];

  Object.keys(genreCatMults).forEach((gc: string): void => {
    // for rating, directly specify multipliers rather than preferred
    // proportions
    Object.keys(robotSettings.ratingMults).forEach((r: string): void => {
      gcrMults.push({
        genreCat: gc,
        rating: parseInt(r),
        mult: genreCatMults[gc] * robotSettings.ratingMults[r],
      });
    });
  });

  // multiply empirical proportions with final multipliers to get preferred
  // genreCat-rating proportions and durations in final playlist
  const idealProps: GcrDuration[] = [];
  let sumIdealProps = 0;
  let newProp: number;

  for (let i = 0; i < gcrTotalDurations.length; i++) {
    newProp = gcrTotalDurations[i].prop! * gcrMults[i].mult!;
    sumIdealProps += newProp;

    idealProps.push({
      genreCat: gcrTotalDurations[i].genreCat,
      rating: gcrTotalDurations[i].rating,
      prop: newProp,
    });
  }

  // normalize proportions
  for (const item of idealProps) {
    item.prop! /= sumIdealProps;
  }

  // calculate preferred genreCat-rating durations (in ms) from props
  const secondsNeeded: number = nHours * 60 * 60 * 1000;

  for (const item of idealProps) {
    item.duration = item.prop! * secondsNeeded;
  }

  return idealProps;
}

function selectGcrTracks(
  rating: number,
  idur: GcrDuration,
  gcrTracks: Track[]
): TrackGroup[] {
  let trackGroups: TrackGroup[] = groupTracks(
    gcrTracks,
    idur.genreCat,
    'grouping'
  );

  // filter out very recently played
  let daysAgo: number;

  trackGroups = trackGroups.filter((tg: TrackGroup): boolean => {
    daysAgo = -(tg.lastPlayed as DateTime).diffNow().as('days');

    return (
      (tg.nPlays >= 5 && daysAgo > 5) || (tg.nPlays < 5 && daysAgo > tg.nPlays)
    );
  });

  // add some noise to ensure smooth distribution
  for (const item of trackGroups) {
    item.nPlays += Math.random() * 0.00001;
  }

  trackGroups = trackGroups.sort((x: TrackGroup, y: TrackGroup): number => {
    return x.nPlays - y.nPlays;
  });

  // convert nPlays to rank
  for (let i = 0; i < trackGroups.length; i++) {
    trackGroups[i].nPlaysRank = i;
  }

  let selectedTrackGroups: TrackGroup[];
  let totalDuration: number;
  let oldestPlayedTrackGroupInBin: TrackGroup;
  let currentCutIndex: number;
  let nBins = 0;
  let cuts: number[];

  do {
    nBins++;

    cuts = Array.from(
      new Array(nBins - 1),
      (_: number, i: number): number =>
        ((i + 1) / nBins) ** robotSettings.decayingCutsExp[rating.toString()] *
        (trackGroups.length - 1)
    );

    cuts.push(trackGroups.length - 1);

    selectedTrackGroups = [];
    totalDuration = 0;
    oldestPlayedTrackGroupInBin = trackGroups[0];
    currentCutIndex = 0;

    for (let i = 1; i < trackGroups.length; i++) {
      if (trackGroups[i].nPlaysRank! <= cuts[currentCutIndex]) {
        // still in current bin
        if (
          trackGroups[i].lastPlayed < oldestPlayedTrackGroupInBin.lastPlayed
        ) {
          oldestPlayedTrackGroupInBin = trackGroups[i];
        }
      } else {
        // select oldest played track in previous bin
        selectedTrackGroups.push(oldestPlayedTrackGroupInBin);
        totalDuration += oldestPlayedTrackGroupInBin.totalDuration;

        // advance to next bin
        oldestPlayedTrackGroupInBin = trackGroups[i];
        currentCutIndex++;
      }
    }

    // push oldest played track from last bin
    selectedTrackGroups.push(oldestPlayedTrackGroupInBin);
    totalDuration += oldestPlayedTrackGroupInBin.totalDuration;
  } while (totalDuration < idur.duration!);

  return selectedTrackGroups;
}

async function collectRobotPool(nHours: number): Promise<TrackGroup[]> {
  const gcrStatsAndTracks: { stats: GcrDuration[]; tracks: Track[] } =
    await getStarredTracks();

  // always get at least 24 hours (trim to desired nHours later)
  const idealDurations: GcrDuration[] = calcIdealGcrDurations(
    gcrStatsAndTracks.stats,
    Math.max(24, nHours)
  );

  const selectedTrackGroups: TrackGroup[][] = [];
  let currentIdurIx = 0;
  let currentGenreCat: string = gcrStatsAndTracks.tracks[0].genreCat!;
  let currentRating: number = gcrStatsAndTracks.tracks[0].rating!;
  let currentStartIx = 0;

  for (let i = 0; i < gcrStatsAndTracks.tracks.length; i++) {
    if (
      gcrStatsAndTracks.tracks[i].genreCat !== currentGenreCat ||
      gcrStatsAndTracks.tracks[i].rating !== currentRating
    ) {
      selectedTrackGroups.push(
        selectGcrTracks(
          currentRating,
          idealDurations[currentIdurIx],
          gcrStatsAndTracks.tracks.slice(currentStartIx, i)
        )
      );

      if (i + 1 < gcrStatsAndTracks.tracks.length) {
        currentIdurIx++;
        currentGenreCat = gcrStatsAndTracks.tracks[i].genreCat!;
        currentRating = gcrStatsAndTracks.tracks[i].rating!;
        currentStartIx = i;
      }
    }
  }

  selectedTrackGroups.push(
    selectGcrTracks(
      currentRating,
      idealDurations[currentIdurIx],
      gcrStatsAndTracks.tracks.slice(currentStartIx)
    )
  );

  return interleaveGroupedTracks(selectedTrackGroups);
}

export async function refreshRobotPlaylists(nHours: number): Promise<Playlist> {
  const nHoursWithExcess: number = robotSettings.excessHours + nHours;

  const robotTrackGroups: TrackGroup[] = await collectRobotPool(
    nHoursWithExcess
  );

  const emptyGenreIds: Record<string, string[]> = Object.fromEntries(
    Object.keys(robotSettings.genreCats).map(
      (gc: string): [string, string[]] => [gc, []]
    )
  );

  const robotIds: Record<string, RobotIds> = {
    M: {
      ids: [],
      genreIds: { ...emptyGenreIds },
      ungroupedIds: [],
    },
    R: {
      ids: [],
      genreIds: { ...emptyGenreIds },
      ungroupedIds: [],
    },
  };

  let accDuration = 0;
  let filling = 'M';
  let trackIds: string[];

  // collect track IDs for robot playlists
  for (const tg of robotTrackGroups) {
    trackIds = tg.tracks.map((t: Track): string => t.id!);

    robotIds[filling]['ids'] = robotIds[filling]['ids'].concat(trackIds);
    robotIds[filling]['genreIds'][tg.genreCat] =
      robotIds[filling]['genreIds'][tg.genreCat].concat(trackIds);

    if (
      robotSettings.genreCats[tg.genreCat].includeInUngrouped &&
      trackIds.length === 1 &&
      tg.totalDuration <= robotSettings.ungroupedTrackDurationLimit
    ) {
      robotIds[filling]['ungroupedIds'].push(trackIds[0]);
    }

    // check if we have enough tracks yet
    accDuration += tg.totalDuration;

    if (accDuration >= nHoursWithExcess * 60 * 60 * 1000) {
      break;
    } else if (accDuration >= robotSettings.excessHours * 60 * 60 * 1000) {
      filling = 'R';
    }
  }

  let robotPlaylists: Record<string, Playlist> = {};
  let robotGenrePlaylistNames: string[];
  let robotPlaylistNames: string[];
  const playlistToShow: Record<string, Playlist> = {};

  for (const f of ['M', 'R']) {
    robotGenrePlaylistNames = genreCatNames.map(
      (gc: string): string => `${f} (${gc})`
    );
    robotPlaylistNames = [f, `${f} (ungrouped)`].concat(
      robotGenrePlaylistNames
    );

    // check if playlists already exist
    playlists.get().forEach((p: Playlist): void => {
      if (robotPlaylistNames.includes(p.name)) {
        robotPlaylists[p.name] = p;
      }
    });

    // set playlists' tracks
    if (objHas(robotPlaylists, f)) {
      playlistToShow[f] = robotPlaylists[f];
      await updatePlaylistTracks(robotPlaylists[f], robotIds[f]['ids'], false);
    } else {
      playlistToShow[f] = await createPlaylist(f, robotIds[f]['ids']);
    }

    for (const gc of genreCatNames) {
      const rPlaylistName = `${f} (${gc})`;

      if (objHas(robotPlaylists, rPlaylistName)) {
        await updatePlaylistTracks(
          robotPlaylists[rPlaylistName],
          robotIds[f]['genreIds'][gc],
          false
        );
      } else {
        await createPlaylist(rPlaylistName, robotIds[f]['genreIds'][gc]);
      }
    }

    if (objHas(robotPlaylists, `${f} (ungrouped)`)) {
      await updatePlaylistTracks(
        robotPlaylists[`${f} (ungrouped)`],
        robotIds[f]['ungroupedIds'],
        false
      );
    } else {
      await createPlaylist(`${f} (ungrouped)`, robotIds[f]['ungroupedIds']);
    }
  }

  return playlistToShow[narrow.get() ? 'M' : 'R'];
}
