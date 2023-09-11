import {
  type AppSettings,
  type Pane,
  type PromptSettings,
  type TrackView,
} from '../../internal';
import { writable, type Writable } from '../tansuStore';

export const appSettings: Writable<AppSettings> = writable({
  apiUrl:
    import.meta.env.VITE_ENV === 'prod'
      ? // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `https://${import.meta.env.VITE_API_HOST}.onrender.com`
      : (import.meta.env.VITE_API_URL as string),
});
export const authed: Writable<boolean> = writable(false);
export const narrow: Writable<boolean> = writable(false);
export const short: Writable<boolean> = writable(false);
export const localMp3FolderHandle: Writable<FileSystemDirectoryHandle | null> =
  writable(null);
export const activePane: Writable<Pane> = writable('auth');
export const view: Writable<TrackView | undefined> = writable(undefined);
export const keyboard: Writable<Record<string, boolean>> = writable({
  shiftPressed: false,
  cmdPressed: false,
});
export const statsContent: Writable<string> = writable('');
export const prompt: Writable<PromptSettings | null> = writable(null);
