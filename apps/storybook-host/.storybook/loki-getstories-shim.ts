/* eslint-disable @typescript-eslint/no-explicit-any */
// Storybook 10 compatibility shim for direct oblador/loki visual regression.
//
// Loki 0.35 (the latest release) predates Storybook 8/9/10's story-store
// rework. Its browser-side story enumeration (`@loki/browser` `getStories`)
// looks for `window.__STORYBOOK_PREVIEW__.storyStore.raw()` — a method
// Storybook 10 no longer exposes — and otherwise throws
// "Unable to get stories. Try adding `import 'loki/configure-react'` ...".
// There is no Angular equivalent of that React helper, so we bridge the gap at
// the direct Loki/Storybook boundary (per the migration roadmap) rather than
// reintroducing an Nx adapter or forking Loki.
//
// Loki calls `await __STORYBOOK_PREVIEW__.extract()` (which caches every CSF
// file) immediately before `storyStore.raw()`, so the synchronous
// `StoryStore.extract()` used below is always safe by the time `raw()` runs.
// The `raw()` method only needs to exist before Loki enumerates stories, which
// happens after the preview has initialized — hence the short poll below.

interface LokiStory {
  id: string;
  kind: string;
  story: string;
  parameters: Record<string, unknown>;
}

const getStore = (preview: any): any => {
  if (!preview) {
    return undefined;
  }
  // `storyStoreValue` is the backing field; the public `storyStore` getter
  // throws until initialization completes, so probe the field first.
  if (preview.storyStoreValue) {
    return preview.storyStoreValue;
  }
  try {
    return preview.storyStore;
  } catch {
    return undefined;
  }
};

const attachLokiRaw = (): boolean => {
  const store = getStore((globalThis as any).__STORYBOOK_PREVIEW__);

  if (!store) {
    return false;
  }

  if (typeof store.raw !== 'function') {
    store.raw = (): LokiStory[] => {
      try {
        return Object.values(store.extract()).map((entry: any) => ({
          id: entry.id,
          kind: entry.title ?? entry.kind,
          story: entry.name ?? entry.story,
          parameters: entry.parameters ?? {},
        }));
      } catch {
        return [];
      }
    };
  }

  return true;
};

// Make Loki wait for the self-hosted emoji web font before it screenshots.
// Loki sets up `window.loki` (with a ready-state manager) via
// `evaluateOnNewDocument` before any page script runs, and awaits
// `window.loki.awaitReady()` before capturing. Registering the font load as a
// pending promise ensures `font-display: block` emoji glyphs are never captured
// while still loading. No-op outside a Loki run (window.loki is undefined).
const awaitEmojiFontForLoki = (): void => {
  const loki = (window as any).loki;
  const fonts = (document as any).fonts;
  if (!loki || typeof loki.registerPendingPromise !== 'function' || !fonts) {
    return;
  }
  try {
    loki.registerPendingPromise(
      Promise.resolve(fonts.load("16px 'Noto Color Emoji'"))
        .catch(() => undefined)
        .then(() => fonts.ready)
    );
  } catch {
    /* ignore */
  }
};

if (typeof window !== 'undefined') {
  if (!attachLokiRaw()) {
    const interval = window.setInterval(() => {
      if (attachLokiRaw()) {
        window.clearInterval(interval);
      }
    }, 10);
    // Safety cap so a preview that never initializes cannot poll forever.
    window.setTimeout(() => window.clearInterval(interval), 30000);
  }
  awaitEmojiFontForLoki();
}
