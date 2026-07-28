import { Filesystem } from '@capacitor/filesystem';
import { readLocalImageAsDataUrl } from '../read-local-image-as-data-url';

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: { readFile: jest.fn() },
}));

const readFile = Filesystem.readFile as jest.Mock;

describe(readLocalImageAsDataUrl.name, () => {
  it.each([
    ['file:///photo.jpg', 'image/jpeg'],
    ['file:///photo.JPEG', 'image/jpeg'],
    ['file:///photo.png', 'image/png'],
    ['file:///photo.webp', 'image/webp'],
    ['file:///photo.gif', 'image/gif'],
    ['file:///photo.heic', 'image/heic'],
    ['file:///photo.heif', 'image/heif'],
    ['file:///photo.unknown', 'image/jpeg'],
    ['file:///photo', 'image/jpeg'],
  ])(
    'wraps a %s string with the %s content type',
    async (path, contentType) => {
      readFile.mockResolvedValue({ data: 'encoded-image' });

      await expect(readLocalImageAsDataUrl(path)).resolves.toBe(
        `data:${contentType};base64,encoded-image`,
      );
      expect(readFile).toHaveBeenCalledWith({ path });
    },
  );

  it('converts web Filesystem blobs to base64', async () => {
    const blob = new Blob(['image']);
    readFile.mockResolvedValue({ data: blob });

    class SuccessfulFileReader {
      error: Error | null = null;
      result = 'data:image/png;base64,YmxvYi1pbWFnZQ==';
      onerror: (() => void) | null = null;
      onloadend: (() => void) | null = null;

      readAsDataURL(): void {
        this.onloadend?.();
      }
    }

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader =
      SuccessfulFileReader as unknown as typeof FileReader;

    try {
      await expect(readLocalImageAsDataUrl('file:///photo.png')).resolves.toBe(
        'data:image/png;base64,YmxvYi1pbWFnZQ==',
      );
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it('rejects when a web blob cannot be read', async () => {
    const blob = new Blob(['image']);
    const readError = new Error('blob read failed');
    readFile.mockResolvedValue({ data: blob });

    class FailingFileReader {
      error = readError;
      result: string | null = null;
      onerror: (() => void) | null = null;
      onloadend: (() => void) | null = null;

      readAsDataURL(): void {
        this.onerror?.();
      }
    }

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = FailingFileReader as unknown as typeof FileReader;

    try {
      await expect(readLocalImageAsDataUrl('file:///photo.png')).rejects.toBe(
        readError,
      );
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
