import {
  type Play,
  type PlaySettings,
  type TabResults,
} from '../../internal';
import { type Writable, writable } from '../tansuStore';

export const playSettings: Writable<PlaySettings | undefined> = writable<
  PlaySettings | undefined
>(undefined);

export const playResults: Writable<TabResults<Play> | undefined> = writable<
  TabResults<Play> | undefined
>(undefined);
