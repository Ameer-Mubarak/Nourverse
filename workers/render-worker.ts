/// <reference lib="webworker" />
import { renderMp4 } from '@/lib/render';

self.onmessage = async (event: MessageEvent) => {
  const { project } = event.data;
  try {
    const blob = await renderMp4(project, (p) => self.postMessage({ type: 'progress', progress: p }));
    self.postMessage({ type: 'done', blob });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'render failed' });
  }
};
