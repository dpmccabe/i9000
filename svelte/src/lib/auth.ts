import {
  type AppSettings,
  appSettings,
  authed,
  DB,
  logMessage,
  objHas,
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
