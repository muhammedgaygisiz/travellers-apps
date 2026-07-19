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
        .then(() => fonts.ready),
    );
  } catch {
    /* ignore */
  }
};

// Every `<img>` on the page, including the one inside `ion-img`'s shadow root.
const collectImages = (): HTMLImageElement[] => {
  const images = Array.from(document.querySelectorAll('img'));

  document.querySelectorAll('ion-img').forEach((ionImg) => {
    const inner = ionImg.shadowRoot?.querySelector('img');
    if (inner) {
      images.push(inner);
    }
  });

  return images;
};

// `complete` (not `naturalWidth`) on purpose: it is also true for an image that
// failed to load, so a story that deliberately renders a broken image settles
// instead of burning the whole timeout.
const imagesSettled = (): boolean =>
  collectImages().every((image) => image.complete);

const QUIET_PERIOD_MS = 300;
const SETTLE_TIMEOUT_MS = 10000;

// A skeleton may be a deferred block's placeholder, waiting out its
// `minimum` timer. During that wait the DOM does not mutate, so quiescence
// alone would settle immediately and capture the placeholder. Keep waiting
// while a skeleton is on screen, but only up to this cap, so a story whose
// subject genuinely *is* a skeleton still settles instead of stalling.
// Must exceed the largest `@placeholder (minimum ...)` in the codebase.
const SKELETON_GRACE_MS = 1500;

const skeletonsSettled = (elapsedMs: number): boolean =>
  elapsedMs >= SKELETON_GRACE_MS ||
  document.querySelector('ion-skeleton-text') === null;

// Resolves once the story has stopped changing and its images have finished.
//
// Loki captures as soon as the network is idle, but content behind Angular's
// `@defer` appears strictly later: `@placeholder (minimum <n>ms)` holds the
// skeleton for at least `n` ms after render, long after the last request
// settles. Without this wait, Loki captures the skeleton for some viewports and
// the real content for others, which reads as a flaky visual test even though
// the render is deterministic (see the restaurant image `@defer` block).
//
// Waiting for DOM quiescence rather than for skeletons to disappear keeps this
// generic: a story whose subject *is* a loading state has no late mutation, so
// it settles after one quiet period instead of stalling until the timeout.
// The timeout is a backstop - a story that never settles is still captured, so
// it fails on its diff rather than hanging the run.
const awaitStorySettled = async (): Promise<void> => {
  const start = Date.now();
  let lastMutation = Date.now();

  const observer = new MutationObserver(() => {
    lastMutation = Date.now();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  try {
    while (Date.now() - start < SETTLE_TIMEOUT_MS) {
      const quiet = Date.now() - lastMutation >= QUIET_PERIOD_MS;
      if (quiet && skeletonsSettled(Date.now() - start) && imagesSettled()) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } finally {
    observer.disconnect();
  }

  // Give the settled DOM two frames to paint before the screenshot.
  await new Promise((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve(undefined)),
    ),
  );
};

// Called once per story render from the preview decorator, so each story gets
// its own settle promise. No-op outside a Loki run (`window.loki` is undefined).
export const registerLokiSettle = (): void => {
  const loki = (window as any).loki;
  if (!loki || typeof loki.registerPendingPromise !== 'function') {
    return;
  }
  try {
    loki.registerPendingPromise(awaitStorySettled());
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
