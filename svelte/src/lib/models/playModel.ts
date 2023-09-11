/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return,
  @typescript-eslint/no-unsafe-argument
*/
import { DateTime } from 'luxon';
import { db } from '../../internal';

export class Play {
  trackId: string;
  dt: DateTime | number;

  constructor(trackId: string, dt: number) {
    this.trackId = trackId;
    this.dt = dt;
  }
}

export async function insertPlay(play: Play): Promise<void> {
  const q = `
    mutation insertPlay($play: PlayInput!) {
      createPlay(input: { play: $play }) {
        clientMutationId
      }
    }
  `;

  await db(q, { play: play }, true);
}
