import {
  findLocalUploadedImage,
  localImageFileName,
} from '../local-image-file';
import { Directory, Filesystem } from '@capacitor/filesystem';

jest.mock('@capacitor/filesystem', () => ({
  Directory: { Documents: 'DOCUMENTS' },
  Filesystem: { readdir: jest.fn() },
}));

const readdir = Filesystem.readdir as jest.Mock;

describe('localImageFileName', () => {
  it('derives a deterministic name from collection, docId and extension', () => {
    expect(localImageFileName('bites', 'abc-123', 'jpg')).toBe(
      'bites_abc-123.jpg',
    );
  });
});

describe('findLocalUploadedImage', () => {
  it('returns the matching file for the document', async () => {
    readdir.mockResolvedValue({
      files: [
        {
          name: 'bites_other.jpg',
          type: 'file',
          uri: 'file:///other',
          mtime: 1,
        },
        {
          name: 'bites_abc-123.jpg',
          type: 'file',
          uri: 'file:///bite',
          mtime: 2,
        },
      ],
    });

    const result = await findLocalUploadedImage('bites', 'abc-123');

    expect(result).toEqual({ name: 'bites_abc-123.jpg', uri: 'file:///bite' });
    expect(readdir).toHaveBeenCalledWith({
      path: '',
      directory: Directory.Documents,
    });
  });

  it('returns the most recently modified match when extensions differ', async () => {
    readdir.mockResolvedValue({
      files: [
        {
          name: 'bites_abc-123.jpg',
          type: 'file',
          uri: 'file:///old',
          mtime: 1,
        },
        {
          name: 'bites_abc-123.png',
          type: 'file',
          uri: 'file:///new',
          mtime: 9,
        },
      ],
    });

    const result = await findLocalUploadedImage('bites', 'abc-123');

    expect(result?.uri).toBe('file:///new');
  });

  it('ignores directories and non-matching names', async () => {
    readdir.mockResolvedValue({
      files: [
        {
          name: 'bites_abc-123',
          type: 'directory',
          uri: 'file:///dir',
          mtime: 5,
        },
        {
          name: 'profiles_abc-123.jpg',
          type: 'file',
          uri: 'file:///p',
          mtime: 5,
        },
      ],
    });

    expect(await findLocalUploadedImage('bites', 'abc-123')).toBeUndefined();
  });

  it('returns undefined when the directory cannot be read', async () => {
    readdir.mockRejectedValue(new Error('no dir'));

    expect(await findLocalUploadedImage('bites', 'abc-123')).toBeUndefined();
  });
});
