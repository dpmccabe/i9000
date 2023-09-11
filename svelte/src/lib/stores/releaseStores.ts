import {
  type Release,
  type ReleaseSettings,
  type TabResults,
} from '../../internal';
import { type Writable, writable } from '../tansuStore';

export const releaseSettings: Writable<ReleaseSettings | undefined> = writable<
  ReleaseSettings | undefined
>(undefined);

export const releaseResults: Writable<TabResults<Release> | undefined> =
  writable<TabResults<Release> | undefined>(undefined);
