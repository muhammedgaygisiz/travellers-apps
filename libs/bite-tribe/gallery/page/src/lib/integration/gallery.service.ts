import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { Directory, FileInfo, Filesystem } from '@capacitor/filesystem';
import { localImageDirectory, localImageSrc } from 'utils';
import { biteIdFromImageName } from './bite-id-from-image-name';

const IMAGE_FILE_PATTERN = /\.(gif|heic|heif|jpe?g|png|webp)$/i;

export type GalleryImage = {
  name: string;
  src: string;
  /** Set only for photos whose filename identifies the Bite they belong to. */
  biteId?: string;
};

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly errorHandler = inject(ErrorHandler);

  readonly images = signal<GalleryImage[]>([]);
  readonly loading = signal(false);

  /**
   * Where the grid was scrolled to when the user left for a Bite, so returning
   * lands on the photo they came from rather than back at the top.
   */
  readonly scrollTop = signal(0);

  rememberScrollTop(scrollTop: number): void {
    this.scrollTop.set(scrollTop);
  }

  /**
   * The photos this device stored for the signed-in user.
   *
   * Reading their own directory rather than the whole device is what keeps a
   * shared browser profile from showing one account the previous account's
   * photos - and, through the file names, which Bites those belonged to. See
   * GitHub issue #1328 and `localImageDirectory`.
   */
  async loadImages(): Promise<void> {
    this.loading.set(true);

    try {
      const path = await localImageDirectory();

      if (!path) {
        this.images.set([]);

        return;
      }

      const { files } = await Filesystem.readdir({
        path,
        directory: Directory.Documents,
      });

      this.images.set(
        await Promise.all(
          files
            .filter(this.isImageFile)
            .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
            .map(async ({ name, uri }) => ({
              name,
              src: await localImageSrc(name, uri),
              biteId: biteIdFromImageName(name),
            })),
        ),
      );
    } catch (error) {
      console.error('Error loading local gallery images:', error);
      this.images.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteAllImages(): Promise<void> {
    const directory = await localImageDirectory();

    if (!directory) {
      return;
    }

    const deletionSucceeded = await Promise.all(
      this.images().map(async ({ name }) => {
        try {
          await Filesystem.deleteFile({
            path: `${directory}/${name}`,
            directory: Directory.Documents,
          });
          return true;
        } catch {
          return false;
        }
      }),
    );

    await this.loadImages();

    if (deletionSucceeded.includes(false)) {
      this.errorHandler.handleError(
        new Error('Some local gallery images could not be deleted.'),
      );
    }
  }

  private readonly isImageFile = (file: FileInfo): boolean =>
    file.type === 'file' && IMAGE_FILE_PATTERN.test(file.name);
}
