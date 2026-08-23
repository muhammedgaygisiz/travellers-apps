import { Directory, Filesystem } from '@capacitor/filesystem';
import { localImagePath } from 'utils';
import { writeBlobToFileSystem } from '../write-blob-to-file-system';

const toBase64Mock = jest.fn();
jest.mock('../to-base-64', () => ({
  toBase64: (): any => toBase64Mock,
}));

jest.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA', Documents: 'DOCUMENTS' },
  Filesystem: {
    writeFile: jest.fn().mockReturnValue({ uri: 'uri' }),
  },
}));

jest.mock('utils', () => ({
  LOCAL_IMAGE_DIRECTORY: 'DATA',
  localImagePath: jest.fn(),
}));

const writeFile = Filesystem.writeFile as jest.Mock;
const localImagePathMock = localImagePath as jest.Mock;

describe('writeBlobToFileSystem', () => {
  const blob = new Blob(['Hello, world!'], { type: 'text/plain' });

  beforeEach(() => {
    jest.clearAllMocks();
    writeFile.mockResolvedValue({ uri: 'uri' });
  });

  it('should write a blob to the file system and return a WriteFileResult', async () => {
    localImagePathMock.mockResolvedValue('user-1/test-file.txt');

    const result = await writeBlobToFileSystem(blob, 'test-file.txt');

    expect(typeof result.uri).toBe('string');
  });

  // The copy belongs to the signed-in user, not to the device. See GitHub
  // issue #1328.
  it('writes into the directory of the signed-in user', async () => {
    localImagePathMock.mockResolvedValue('user-1/test-file.txt');

    await writeBlobToFileSystem(blob, 'test-file.txt');

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'user-1/test-file.txt',
        directory: Directory.Data,
        recursive: true,
      }),
    );
  });

  it('refuses to write when nobody is signed in to own the copy', async () => {
    localImagePathMock.mockResolvedValue(undefined);

    await expect(writeBlobToFileSystem(blob, 'test-file.txt')).rejects.toThrow(
      'test-file.txt',
    );
    expect(writeFile).not.toHaveBeenCalled();
  });
});
