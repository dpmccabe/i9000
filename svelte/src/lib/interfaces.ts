import { type DateTime } from 'luxon';
import { type Track } from '../internal';

export interface AppSettings {
  apiUrl: string;
  apiKey?: string;
  cloudfrontUrl?: string;
  doScrobble?: boolean;
  lastfmUsername?: string;
}

export interface Col {
  colId: string;
  displayName: string;
  dbCols: string[];
  sortCols: string[];
  truncatable: boolean;
  aggregatable: boolean;
  visibleByDefault: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  sortCol: string;
  sortAsc: boolean;
  ix: number;
}

export interface PlaylistFolder {
  id: number;
  name: string;
  ix: number;
  playlists?: Playlist[];
}

export interface OrganizedPlaylists {
  playlistFolders: PlaylistFolder[];
  nakedPlaylists: Playlist[];
}

export interface PlaylistTrack {
  playlistId: number;
  trackId: string;
  ix: number;
}

export interface TrackGroup {
  genreCat: string;
  gid: string;
  totalDuration: number;
  lastPlayed: DateTime | number;
  nPlays: number;
  nPlaysRank?: number;
  tracks: Track[];
  // below: for interleaving
  j?: number;
  b1?: number;
  b2?: number;
  b?: number;
}

export interface Command {
  handler: (args: string) => Promise<void>;
  hintTextBase: string;
  hinter: (args: string) => void;
}

export interface TagEditValue {
  allIdentical: boolean;
  commonValue: unknown;
  newValue: unknown;
}

export enum TagField {
  TextField = 0,
  NumberField = 1,
  OrdinalField = 2,
  CheckboxField = 3,
  TimestampField = 4,
  RatingField = 5,
  StaticField = 6,
  StaticDuration = 7,
  StaticTimestamp = 8,
  DurationField = 9,
}

export type Pane =
  | 'auth'
  | 'import-queue'
  | 'col-selector'
  | 'command-bar'
  | 'main'
  | 'help'
  | 'playlist-selector'
  | 'playlists'
  | 'mobile-searcher'
  | 'tag-editor'
  | 'title-parser'
  | 'playlists-editor'
  | 'play-queue'
  | 'search-replace'
  | 'this-that'
  | 'tracks'
  | 'tab-filters';

export type TrackView = 'tracks' | 'albums' | 'releases';

export type MessageType = 'error' | 'info' | 'success';

export interface GcrDuration {
  genreCat: string;
  rating: number;
  duration?: number;
  prop?: number;
  mult?: number;
}

export interface ScrobblePayload {
  album?: string;
  album_artist?: string;
  artist: string;
  duration: number;
  title: string;
  track_number?: number;
}

export interface TrackMod {
  changed: boolean;
  old: string;
  new: string;
}

export type TrackModSet = Record<string, TrackMod>;

export interface TrackParseMod {
  id: string;
  anyChanged?: boolean;
  mod: TrackModSet;
}

export interface SearchReplaceMod extends TrackMod {
  id: string;
}

export interface GqlRequest {
  q: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: Record<string, any>;
}

export interface NumberRange {
  min?: number;
  max?: number;
}

export interface ThisThatMod {
  id: string;
  anyChanged?: boolean;
  mod: TrackModSet;
}

export interface RobotGenreCat {
  prop: number;
  includeInUngrouped: boolean;
}

export interface RobotSettings {
  genreCats: Record<string, RobotGenreCat>;
  ratingMults: Record<string, number>;
  ungroupedTrackDurationLimit: number;
  decayingCutsExp: number;
}

export interface ImportArtistGenre {
  artist: string;
  genre: string;
}

export type ImportState =
  | 'todo'
  | 'uploading'
  | 'success'
  | 'retrying'
  | 'failed';

export interface ImportingMp3 {
  file: File;
  state: ImportState;
  failureCount: number;
  failureMsg?: string | null;
  track?: Track;
}

export interface PromptSettings {
  shown: boolean;
  title: string;
  hasTextInput: boolean;
  textInput?: HTMLInputElement;
  textInputValue?: string;
  textPlaceholder?: string;
  okAction: () => void;
}

export const id3Map: Record<string, string> = {
  album: 'album',
  albumArtist: 'albumartist',
  artist: 'artist',
  compilation: 'compilation',
  composer: 'composer',
  discI: 'discnumber',
  genre: 'genre',
  title: 'title',
  trackI: 'tracknumber',
  year: 'date',
};

export interface GroupedAggregate {
  keys: string[];
  distinctCount: Record<string, string>;
}
