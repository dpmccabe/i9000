/* eslint-disable */
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app') as Element,
});

const updateSW: (reloadPage?: boolean) => Promise<void> = registerSW({
  onNeedRefresh() {
    if (confirm('Update SW?')) {
      updateSW().then((): void => console.log('Updated SW'));
    }
  },
  onOfflineReady() {},
});

export default app;
