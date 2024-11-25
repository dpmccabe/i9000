import { type RobotSettings } from '../../internal';

export const robotSettings: RobotSettings = {
  genreCats: {
    classical: { prop: 0.25, includeInUngrouped: false },
    other: { prop: 0.375, includeInUngrouped: true },
    world: { prop: 0.375, includeInUngrouped: true },
  },
  ratingMults: { '1': 2, '2': 5, '3': 8 },
  ungroupedTrackDurationLimit: 10 * 60 * 1000, // 10 minutes
  decayingCutsExp: 3,
  excessHours: 8,
};
