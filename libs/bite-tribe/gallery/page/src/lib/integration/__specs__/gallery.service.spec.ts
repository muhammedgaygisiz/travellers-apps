import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { GalleryService } from '../gallery.service';

jest.mock('@capacitor/filesystem', () => ({
  Directory: { Documents: 'DOCUMENTS' },
  Filesystem: {
    deleteFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

// Turning a stored file into a loadable URL differs per platform and is covered
// by its own tests; here it only has to be deterministic.
jest.mock('utils', () => ({
  localImageSrc: jest.fn((_name: string, uri: string) => Promise.resolve(uri)),
}));

describe(GalleryService.name, () => {
  let service: GalleryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GalleryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('loads only local image files ordered by modification time', async () => {
    (Filesystem.readdir as jest.Mock).mockResolvedValue({
      files: [
        { name: 'notes.txt', type: 'file', uri: 'notes', mtime: 3 },
        { name: 'older.jpg', type: 'file', uri: 'older-uri', mtime: 1 },
        { name: 'newer.PNG', type: 'file', uri: 'newer-uri', mtime: 2 },
        { name: 'folder.jpg', type: 'directory', uri: 'folder', mtime: 4 },
      ],
    });

    await service.loadImages();

    expect(Filesystem.readdir).toHaveBeenCalledWith({
      path: '',
      directory: Directory.Documents,
    });
    expect(service.images()).toEqual([
      { name: 'newer.PNG', src: 'newer-uri' },
      { name: 'older.jpg', src: 'older-uri' },
    ]);
  });

  it('deletes only the loaded gallery images and reloads the list', async () => {
    service.images.set([
      { name: 'first.jpg', src: 'first-uri' },
      { name: 'second.webp', src: 'second-uri' },
    ]);
    (Filesystem.deleteFile as jest.Mock).mockResolvedValue(undefined);
    (Filesystem.readdir as jest.Mock).mockResolvedValue({ files: [] });

    await service.deleteAllImages();

    expect(Filesystem.deleteFile).toHaveBeenCalledTimes(2);
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: 'first.jpg',
      directory: Directory.Documents,
    });
    expect(service.images()).toEqual([]);
  });

  it('returns an empty gallery when the directory cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    (Filesystem.readdir as jest.Mock).mockRejectedValue(
      new Error('unavailable'),
    );

    await service.loadImages();

    expect(service.images()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('reports partial deletion failures and reloads remaining images', async () => {
    const errorHandler = TestBed.inject(ErrorHandler);
    jest.spyOn(errorHandler, 'handleError').mockImplementation();
    service.images.set([
      { name: 'deleted.jpg', src: 'deleted-uri' },
      { name: 'remaining.jpg', src: 'remaining-uri' },
    ]);
    (Filesystem.deleteFile as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('delete failed'));
    (Filesystem.readdir as jest.Mock).mockResolvedValue({
      files: [
        {
          name: 'remaining.jpg',
          type: 'file',
          uri: 'remaining-uri',
          mtime: 1,
        },
      ],
    });

    await service.deleteAllImages();

    expect(errorHandler.handleError).toHaveBeenCalledWith(expect.any(Error));
    expect(service.images()).toEqual([
      { name: 'remaining.jpg', src: 'remaining-uri' },
    ]);
  });
});
