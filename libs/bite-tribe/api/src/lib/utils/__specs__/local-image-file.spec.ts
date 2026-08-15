import {
  findLocalUploadedImage,
  localImageFileName,
} from '../local-image-file';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { localImageDirectory } from 'utils';

jest.mock('@capacitor/filesystem', () => ({
  Directory: { Documents: 'DOCUMENTS' },
  Filesystem: { readdir: jest.fn() },
}));

jest.mock('utils', () => ({
  localImageDirectory: jest.fn(() => Promise.resolve('user-1')),
}));

const readdir = Filesystem.readdir as jest.Mock;
const localImageDirectoryMock = localImageDirectory as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  localImageDirectoryMock.mockResolvedValue('user-1');
});

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
      path: 'user-1',
      directory: Directory.Documents,
    });
  });

  // A copy another account left on this device is not this user's to find. See
  // GitHub issue #1328.
  it('finds nothing when nobody is signed in', async () => {
    localImageDirectoryMock.mockResolvedValue(undefined);

    expect(await findLocalUploadedImage('bites', 'abc-123')).toBeUndefined();
    expect(readdir).not.toHaveBeenCalled();
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
