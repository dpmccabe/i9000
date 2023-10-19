import {
  activePane,
  type AppSettings,
  appSettings,
  authed,
  cachedTrackIds,
  DB,
  getOfflineMp3s,
  getOrganizedPlaylists,
  initPlayer,
  logMessage,
  objHas,
  organizedPlaylists,
  setCurrentPlaylist,
  view,
} from '../internal';

async function applySettings(
  fetchedSettings: Record<string, string>
): Promise<void> {
  appSettings.update((as: AppSettings): AppSettings => {
    as.apiKey = fetchedSettings.api_key;
    as.cloudfrontUrl = fetchedSettings.cloudfront_url;
    as.doScrobble = fetchedSettings.do_scrobble === 'true';

    if (
      objHas(fetchedSettings, 'lastfm_username') &&
      fetchedSettings.lastfm_username != ''
    ) {
      as.lastfmUsername = fetchedSettings.lastfm_username;
    }

    return as;
  });

  const db: DB = new DB();
  db.configure(fetchedSettings.graphql_url, fetchedSettings.graphql_auth_token);

  authed.set(true);
}

export async function checkAuth(): Promise<void> {
  const auth: string | null = localStorage.getItem('auth');

  if (auth != null) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const settings: Record<string, string> = JSON.parse(auth);
    await applySettings(settings);
  }
}

export async function logInToApi(
  username: string,
  password: string
): Promise<void> {
  const url: string = [appSettings.get().apiUrl, 'log-in'].join('/');

  try {
    const res: Response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });

    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const settings: Record<string, string> = await res.json();
      await applySettings(settings);
      localStorage.setItem('auth', JSON.stringify(settings));
      await postAuthSetup();
    } else {
      logMessage('Invalid username or password', 'error');
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      logMessage(e.message, 'error');
    } else {
      console.log(e);
    }
  }
}

export async function postAuthSetup(): Promise<void> {
  activePane.set('main');
  organizedPlaylists.set(await getOrganizedPlaylists());

  if (import.meta.env.VITE_ENV !== 'dev') {
    await Notification.requestPermission();
  }

  (document.activeElement as HTMLElement).blur();

  if (window.location.hash.substring(1) === 'releases') {
    view.set('releases');
  } else if (window.location.hash.substring(1) === 'albums') {
    view.set('albums');
  } else {
    const savedTrackSettingsItem: string | null =
      localStorage.getItem('track-settings');

    if (savedTrackSettingsItem != null) {
      const savedTrackSettings: Record<string, any> = JSON.parse(
        savedTrackSettingsItem
      );

      const playlistId: number | null = savedTrackSettings.playlistId;
      if (playlistId != null) await setCurrentPlaylist(playlistId);
    }

    view.set('tracks');
  }

  cachedTrackIds.set(new Set(await getOfflineMp3s()));

  await initPlayer();
}
