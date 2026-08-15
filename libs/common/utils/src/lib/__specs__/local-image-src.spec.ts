import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { localImageSrc } from '../local-image-src';

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
    convertFileSrc: jest.fn((uri: string) => `capacitor-served/${uri}`),
  },
}));

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: { readFile: jest.fn() },
}));

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const readFile = Filesystem.readFile as jest.Mock;

describe('localImageSrc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on a device', () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(true);
    });

    it('lets the WebView serve the file, without reading it', async () => {
      const src = await localImageSrc(
        'bites_abc.jpg',
        'file:///docs/bites_abc.jpg',
      );

      expect(src).toBe('capacitor-served/file:///docs/bites_abc.jpg');
      expect(readFile).not.toHaveBeenCalled();
    });
  });

  describe('in a browser', () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(false);
    });

    // The stored path is an IndexedDB key, not a URL, so it has to be read back
    // and inlined or the browser requests it from the dev server. See #1232.
    it('inlines the stored bytes as a data URL', async () => {
      readFile.mockResolvedValue({ data: 'AAECAw==' });

      const src = await localImageSrc(
        'bites_abc.jpg',
        '/DOCUMENTS/user-1/bites_abc.jpg',
      );

      expect(src).toBe('data:image/jpeg;base64,AAECAw==');
    });

    // The file name alone no longer locates the file: local copies live in a
    // per-user directory since issue #1328.
    it('reads the stored path rather than the bare file name', async () => {
      readFile.mockResolvedValue({ data: 'AAECAw==' });

      await localImageSrc('bites_abc.jpg', '/DOCUMENTS/user-1/bites_abc.jpg');

      expect(readFile).toHaveBeenCalledWith({
        path: '/DOCUMENTS/user-1/bites_abc.jpg',
      });
    });

    it.each([
      ['photo.png', 'image/png'],
      ['photo.webp', 'image/webp'],
      ['photo.gif', 'image/gif'],
      ['photo.HEIC', 'image/heic'],
      ['photo.jpeg', 'image/jpeg'],
    ])('types %s as %s', async (name, contentType) => {
      readFile.mockResolvedValue({ data: 'AAECAw==' });

      expect(await localImageSrc(name, `DOCUMENTS/${name}`)).toBe(
        `data:${contentType};base64,AAECAw==`,
      );
    });

    it('reads a stored Blob as a data URL too', async () => {
      readFile.mockResolvedValue({
        data: new Blob(['hello'], { type: 'image/png' }),
      });

      expect(await localImageSrc('photo.png', 'DOCUMENTS/photo.png')).toMatch(
        /^data:image\/png;base64,/,
      );
    });

    it('yields nothing rather than a broken request when the read fails', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      readFile.mockRejectedValue(new Error('File does not exist.'));

      expect(await localImageSrc('gone.jpg', 'DOCUMENTS/gone.jpg')).toBe('');
    });
  });
});
