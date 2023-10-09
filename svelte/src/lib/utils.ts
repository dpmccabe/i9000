import { toast } from '@zerodevx/svelte-toast';
import { DateTime } from 'luxon';
import {
  type MessageType,
  noneAggKey,
  type Track,
  type TrackGroup,
  unaccent,
} from '../internal';

export function camelToScreamingSnakeCase(str: string): string {
  return str
    .replace(/[A-Z]/g, (letter: string): `_${string}` => `_${letter}`)
    .toUpperCase();
}

export function camelToKebabCase(str: string): string {
  return str
    .replace(/[A-Z]/g, (letter: string): `-${string}` => `-${letter}`)
    .toLowerCase();
}

export function formatDuration(ms: number, fractional = false): string {
  let s: number = ms / 1000;
  if (!fractional) s += 0.5; // rounding via Math.floor
  let sStr: string;

  if (s <= 59) {
    if (fractional) {
      sStr = fractionalSeconds(s);
    } else {
      s = Math.floor(s);
      sStr = s.toString().padStart(2, '0');
    }

    return ['0', sStr].join(':');
  } else {
    let m: number = Math.floor(s / 60);
    s -= m * 60;

    if (fractional) {
      sStr = fractionalSeconds(s);
    } else {
      s = Math.floor(s);
      sStr = s.toString().padStart(2, '0');
    }

    if (m <= 60) {
      return [m.toString(), sStr].join(':');
    } else {
      let h: number = Math.floor(m / 60);
      m -= h * 60;

      if (h <= 24) {
        return [h.toString(), m.toString().padStart(2, '0'), sStr].join(':');
      } else {
        const d: number = Math.floor(h / 24);
        h -= d * 24;

        return [
          d.toString(),
          h.toString().padStart(2, '0'),
          m.toString().padStart(2, '0'),
          sStr,
        ].join(':');
      }
    }
  }
}

function fractionalSeconds(s: number): string {
  const fsStr: string = (s - Math.floor(s))
    .toFixed(3)
    .replace(/[.0]+$/, '')
    .replace(/^[0.]+/, '');

  s = Math.floor(s);
  let sStr: string = s.toString().padStart(2, '0');

  if (fsStr.length > 0) sStr = [sStr, '.', fsStr].join('');

  return sStr;
}

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

export function shuffle<Type>(arr: Type[]): void {
  let j: number;
  let temp: Type;

  for (let i = arr.length - 1; i >= 1; i--) {
    j = getRandomInt(i);
    temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
}

export function groupTracks(
  tracks: Track[],
  genreCat: string,
  by: 'grouping' | 'album'
): TrackGroup[] {
  const groupedTracks: TrackGroup[] = [];

  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i][by] == null) {
      // not part of a grouping
      groupedTracks.push({
        genreCat: genreCat,
        gid: tracks[i].id!,
        totalDuration: tracks[i].duration!,
        lastPlayed: tracks[i].lastPlayed!,
        nPlays: tracks[i].nPlays!,
        tracks: [tracks[i]],
      });
    } else {
      if (
        i >= 1 &&
        tracks[i][by] === groupedTracks[groupedTracks.length - 1].tracks[0][by]
      ) {
        // continue collecting this group of tracks in latest track group
        groupedTracks[groupedTracks.length - 1].tracks.push(tracks[i]);
        groupedTracks[groupedTracks.length - 1].totalDuration +=
          tracks[i].duration!;
      } else {
        // push a new grouping starting with this track
        groupedTracks.push({
          genreCat: genreCat,
          gid: tracks[i][by]!,
          totalDuration: tracks[i].duration!,
          lastPlayed: tracks[i].lastPlayed!,
          nPlays: tracks[i].nPlays!,
          tracks: [tracks[i]],
        });
      }
    }
  }

  return groupedTracks;
}

export function formatDate(dt: DateTime | null): string {
  return dt == null ? '' : dt.toFormat('yyyy-LL-dd');
}

export function formatDateTime(dt: DateTime | null): string {
  return dt == null
    ? ''
    : dt
        .setZone('America/New_York')
        .toFormat('yyyy-LL-dd, hh:mm a')
        .toLowerCase();
}

export function parseDateTime(s: string): DateTime {
  return DateTime.fromFormat(s, 'yyyy-LL-dd, hh:mm a')
    .setZone('America/New_York')
    .setZone('UTC');
}

export function discAndTrack(track: Track): string {
  let s: string;

  if (track.discI == null && track.trackI == null) {
    return '';
  } else if (track.discI == null) {
    s = `${track.trackI ?? ''}`;

    if (track.trackN != null) {
      s += ` <span clas="slash">/</span> ${track.trackN}`;
    }

    return `(${s})`;
  } else if (track.trackI == null) {
    s = `disc ${track.discI}`;

    if (track.discN != null) {
      s += ` <span clas="slash">/</span> ${track.discN}`;
    }

    return `(${s})`;
  } else {
    let sDisc = `disc ${track.discI}`;
    let sTrack = `${track.trackI}`;

    if (track.discN != null) {
      sDisc += ` <span clas="slash">/</span> ${track.discN}`;
    }

    if (track.trackN != null) {
      sTrack += ` <span clas="slash">/</span> ${track.trackN}`;
    }

    return `(${[sDisc, sTrack].join(', ')})`;
  }
}

export function titleCaseString(x: string): string {
  const smallWords =
    /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via)$/i;
  const alphanumericPattern = /([A-Za-z\d\u00C0-\u00FF])/;
  const wordSeparators = /([ :–—-])/;

  return x
    .split(wordSeparators)
    .map((current: string, index: number, array: string[]): string => {
      if (
        /* Check for small words */
        current.search(smallWords) > -1 &&
        /* Skip first and last word */
        index !== 0 &&
        index !== array.length - 1 &&
        /* Ignore title end and subtitle start */
        array[index - 3] !== ':' &&
        array[index + 1] !== ':' &&
        /* Ignore small words that start a hyphenated phrase */
        (array[index + 1] !== '-' ||
          (array[index - 1] === '-' && array[index + 1] === '-'))
      ) {
        return current.toLowerCase();
      }

      /* Capitalize the first letter */
      return current
        .toLowerCase()
        .replace(alphanumericPattern, (match: string): string => {
          return match.toUpperCase();
        });
    })
    .join('');
}

export function unactionAll(): void {
  const divs: HTMLCollectionOf<Element> =
    document.getElementsByClassName('actioning');

  while (divs.length) {
    divs[0].classList.remove('actioning');
  }
}

export function infiniteScroll(
  loadingEl: HTMLElement,
  getMoreFn: () => void
): void {
  const observer: IntersectionObserver = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]): void => {
      const first: IntersectionObserverEntry = entries[0];
      if (first.isIntersecting) getMoreFn();
    },
    { threshold: 0.25 }
  );

  observer.observe(loadingEl as Element);
}

export function logMessage(msg: string, msgType: MessageType = 'info'): void {
  let icon = '';

  switch (msgType) {
    case 'success':
      icon = '✔';
      break;
    case 'error':
      icon = '⚠';
      break;
    case 'info':
      icon = 'ⓘ';
      break;
  }

  toast.push(
    `<span class="icon">${icon}</span><span class="msg">${msg}</span>`,
    {
      classes: [msgType],
    }
  );
}

export function escapeRegExp(x: string): string {
  return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function clickOutside(
  node: HTMLElement,
  handler: () => void
): { destroy: () => void } {
  const onClick = (event: MouseEvent) => {
    return (
      !node.contains(event.target as HTMLElement) &&
      !event.defaultPrevented &&
      handler()
    );
  };

  document.addEventListener('click', onClick, true);

  return {
    destroy() {
      document.removeEventListener('click', onClick, true);
    },
  };
}

export function objHas(obj: object, prop: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function trimWithin(x: string) {
  return x.replace(/[\s\t]+/g, ' ').trim();
}

export function normString(x: string): string {
  return unaccent(trimWithin(x.normalize('NFC').toLowerCase()));
}
