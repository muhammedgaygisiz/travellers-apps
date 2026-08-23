import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import {
  LOCAL_IMAGE_DIRECTORY,
  localImageDirectory,
  localImagePath,
  resetLocalImageDirectoryForTesting,
} from '../local-image-directory';

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn() },
}));

jest.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA', Documents: 'DOCUMENTS' },
  Filesystem: {
    deleteFile: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    rename: jest.fn(),
  },
}));

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const getCurrentUser = FirebaseAuthentication.getCurrentUser as jest.Mock;
const deleteFile = Filesystem.deleteFile as jest.Mock;
const mkdir = Filesystem.mkdir as jest.Mock;
const readdir = Filesystem.readdir as jest.Mock;
const rename = Filesystem.rename as jest.Mock;

const signedInAs = (uid: string | undefined): void => {
  getCurrentUser.mockResolvedValue({ user: uid ? { uid } : null });
};

type LegacyFile = { name: string; type: 'file' | 'directory' };

/** Mocks what the old public directory holds, per path within it. */
const legacyDirectoryHolds = (contents: Record<string, LegacyFile[]>): void => {
  readdir.mockImplementation(({ path }: { path: string }) =>
    Promise.resolve({ files: contents[path] ?? [] }),
  );
};

describe('localImageDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLocalImageDirectoryForTesting();

    isNativePlatform.mockReturnValue(false);
    readdir.mockResolvedValue({ files: [] });
    mkdir.mockResolvedValue(undefined);
    deleteFile.mockResolvedValue(undefined);
    rename.mockResolvedValue(undefined);
  });

  // The copies used to live in `Documents`, which Capacitor maps to Android's
  // public external storage: writing there needs a permission the app does not
  // declare, so on API 29 and below every write was denied. See issue #1229.
  it('keeps the copies in app-private storage, not the public folder', () => {
    expect(LOCAL_IMAGE_DIRECTORY).toBe(Directory.Data);
  });

  it('names the directory after the signed-in user and creates it', async () => {
    signedInAs('user-1');

    expect(await localImageDirectory()).toBe('user-1');
    expect(mkdir).toHaveBeenCalledWith({
      path: 'user-1',
      directory: Directory.Data,
      recursive: true,
    });
  });

  it('gives no directory when nobody is signed in to own one', async () => {
    signedInAs(undefined);

    expect(await localImageDirectory()).toBeUndefined();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('gives no directory when the current user cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    getCurrentUser.mockRejectedValue(new Error('auth unavailable'));

    expect(await localImageDirectory()).toBeUndefined();
  });

  it('prepares the directory once per user', async () => {
    signedInAs('user-1');

    await localImageDirectory();
    await localImageDirectory();

    expect(mkdir).toHaveBeenCalledTimes(1);
  });

  it('prepares again when a different user signs in', async () => {
    signedInAs('user-1');
    await localImageDirectory();

    signedInAs('user-2');

    expect(await localImageDirectory()).toBe('user-2');
    expect(mkdir).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: 'user-2' }),
    );
  });

  it('still answers when the directory cannot be created', async () => {
    signedInAs('user-1');
    mkdir.mockRejectedValue(new Error('mkdir failed'));

    expect(await localImageDirectory()).toBe('user-1');
  });

  describe('migrating images left flat in the old public directory', () => {
    beforeEach(() => {
      legacyDirectoryHolds({
        '': [
          { name: 'bites_abc.jpg', type: 'file' },
          { name: 'notes.txt', type: 'file' },
          { name: 'user-9', type: 'directory' },
          { name: 'avatar.PNG', type: 'file' },
        ],
      });
    });

    // A phone has one owner, so the files are the signed-in user's and their
    // gallery should survive the move.
    it('adopts them into the user directory on a device', async () => {
      isNativePlatform.mockReturnValue(true);
      signedInAs('user-1');

      await localImageDirectory();

      expect(rename).toHaveBeenCalledTimes(2);
      expect(rename).toHaveBeenCalledWith({
        from: 'bites_abc.jpg',
        to: 'user-1/bites_abc.jpg',
        directory: Directory.Documents,
        toDirectory: Directory.Data,
      });
      expect(rename).toHaveBeenCalledWith({
        from: 'avatar.PNG',
        to: 'user-1/avatar.PNG',
        directory: Directory.Documents,
        toDirectory: Directory.Data,
      });
      expect(deleteFile).not.toHaveBeenCalled();
    });

    // In a browser the previous account is exactly who they may belong to, and
    // nothing in the file says otherwise.
    it('deletes them in a browser', async () => {
      signedInAs('user-1');

      await localImageDirectory();

      expect(deleteFile).toHaveBeenCalledTimes(2);
      expect(deleteFile).toHaveBeenCalledWith({
        path: 'bites_abc.jpg',
        directory: Directory.Documents,
      });
      expect(rename).not.toHaveBeenCalled();
    });

    it('keeps going when one of them cannot be migrated', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      signedInAs('user-1');
      deleteFile
        .mockRejectedValueOnce(new Error('delete failed'))
        .mockResolvedValueOnce(undefined);

      expect(await localImageDirectory()).toBe('user-1');
      expect(deleteFile).toHaveBeenCalledTimes(2);
    });

    it('still answers when the old directory cannot be read', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      signedInAs('user-1');
      readdir.mockRejectedValue(new Error('no dir'));

      expect(await localImageDirectory()).toBe('user-1');
      expect(deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('migrating images the user already owned in the old directory', () => {
    beforeEach(() => {
      legacyDirectoryHolds({
        'user-1': [
          { name: 'bites_abc.jpg', type: 'file' },
          { name: 'notes.txt', type: 'file' },
        ],
      });
    });

    // These carry the owner in their path, so unlike the flat ones there is
    // nothing to guess and nothing to drop - in a browser either.
    it('moves them across on a device', async () => {
      isNativePlatform.mockReturnValue(true);
      signedInAs('user-1');

      await localImageDirectory();

      expect(rename).toHaveBeenCalledTimes(1);
      expect(rename).toHaveBeenCalledWith({
        from: 'user-1/bites_abc.jpg',
        to: 'user-1/bites_abc.jpg',
        directory: Directory.Documents,
        toDirectory: Directory.Data,
      });
    });

    it('moves them across in a browser too', async () => {
      signedInAs('user-1');

      await localImageDirectory();

      expect(rename).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'user-1/bites_abc.jpg' }),
      );
      expect(deleteFile).not.toHaveBeenCalled();
    });
  });
});

describe('localImagePath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLocalImageDirectoryForTesting();

    isNativePlatform.mockReturnValue(false);
    readdir.mockResolvedValue({ files: [] });
    mkdir.mockResolvedValue(undefined);
  });

  it('puts the file in the signed-in user directory', async () => {
    signedInAs('user-1');

    expect(await localImagePath('bites_abc.jpg')).toBe('user-1/bites_abc.jpg');
  });

  it('has nowhere to put the file when nobody is signed in', async () => {
    signedInAs(undefined);

    expect(await localImagePath('bites_abc.jpg')).toBeUndefined();
  });
});
