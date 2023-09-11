import { appSettings, logMessage } from '../../internal';

const maxFailures = 5;

export class RetagOp {
  trackId: string;
  tags: Record<string, string>;
  failures = 0;

  constructor(trackId: string, tags: Record<string, string>) {
    logMessage(`Retagging ${trackId}.mp3&hellip;`);

    this.trackId = trackId;
    this.tags = tags;
    void this.doRetag().then((): void => {
      logMessage(`Retagged ${trackId}.mp3`, 'success');
    });
  }

  async doRetag(): Promise<void> {
    try {
      await fetch([appSettings.get().apiUrl, 'tracks', 'retag'].join('/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': appSettings.get().apiKey!,
        },
        body: JSON.stringify({ track_tags: { [this.trackId]: this.tags } }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: unknown) {
      this.failures++;

      if (this.failures < maxFailures) {
        const delay: number = Math.pow(2, this.failures);
        setTimeout((): void => void this.doRetag(), delay * 1000);
      } else {
        console.log(e);
        // eslint-disable-next-line
        logMessage(`Error retagging ${this.trackId}: ${e}`, 'error');
      }
    }
  }
}
