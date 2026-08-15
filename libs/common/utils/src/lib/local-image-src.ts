import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const contentTypeOf = (name: string): string =>
  CONTENT_TYPE_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ??
  'image/jpeg';

const asDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (): void => resolve(String(reader.result));
    reader.onerror = (): void => resolve('');
    reader.readAsDataURL(blob);
  });

/**
 * A URL an `<img>` can actually load for a photo this device stored locally.
 *
 * On a device the file is real, and `convertFileSrc` rewrites its path into
 * something the WebView will serve - lazily, so a photo costs nothing until it
 * scrolls into view. In a browser there is no filesystem: the Capacitor web
 * implementation keeps files in IndexedDB and reports a pseudo-path
 * (`/DOCUMENTS/<user>/<name>`), while `convertFileSrc` is the identity function,
 * so that path would end up in `src` as a relative URL and 404 against the dev
 * server. The web branch therefore reads the bytes back out and inlines them.
 *
 * The read goes through the stored `uri` rather than the file name and a
 * directory, because the name alone no longer locates the file: local copies
 * live in a per-user directory since issue #1328. `name` is still what names
 * the content type.
 *
 * Data URLs rather than object URLs on purpose: the callers reload their list
 * every time their page is entered, and an object URL would have to be revoked
 * per photo per visit or leak. Inlining also means the read is eager on web,
 * which is fine for a local gallery and deliberate - do not "optimize" it back
 * into a lazy path.
 *
 * Note that a browser cannot decode HEIC at all, so an iPhone photo stays
 * broken on web however correct this URL is.
 */
export const localImageSrc = async (
  name: string,
  uri: string,
): Promise<string> => {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.convertFileSrc(uri);
  }

  try {
    const { data } = await Filesystem.readFile({ path: uri });

    return typeof data === 'string'
      ? `data:${contentTypeOf(name)};base64,${data}`
      : await asDataUrl(data);
  } catch (error) {
    console.error(`Error reading local image ${name}:`, error);

    return '';
  }
};
