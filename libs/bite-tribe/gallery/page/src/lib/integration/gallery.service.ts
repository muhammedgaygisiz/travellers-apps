import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { Directory, FileInfo, Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const IMAGE_FILE_PATTERN = /\.(gif|heic|heif|jpe?g|png|webp)$/i;

export type GalleryImage = {
  name: string;
  src: string;
};

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly errorHandler = inject(ErrorHandler);

  readonly images = signal<GalleryImage[]>([]);
  readonly loading = signal(false);

  async loadImages(): Promise<void> {
    this.loading.set(true);

    try {
      const { files } = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents,
      });

      this.images.set(
        files
          .filter(this.isImageFile)
          .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
          .map(({ name, uri }) => ({
            name,
            src: Capacitor.convertFileSrc(uri),
          })),
      );
    } catch (error) {
      console.error('Error loading local gallery images:', error);
      this.images.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteAllImages(): Promise<void> {
    const deletionSucceeded = await Promise.all(
      this.images().map(async ({ name }) => {
        try {
          await Filesystem.deleteFile({
            path: name,
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
