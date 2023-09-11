import {
  type Album,
  type AlbumSettings,
  type TabResults,
} from '../../internal';
import { type Writable, writable } from '../tansuStore';

export const albumSettings: Writable<AlbumSettings | undefined> = writable<
  AlbumSettings | undefined
>(undefined);

export const albumResults: Writable<TabResults<Album> | undefined> = writable<
  TabResults<Album> | undefined
>(undefined);
