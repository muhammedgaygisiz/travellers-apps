import { EventEmitter, inject, Injectable, signal } from '@angular/core';
import { FileInfo, Filesystem } from '@capacitor/filesystem';
import { ModalController } from '@ionic/angular/standalone';
import {
  LOCAL_IMAGE_DIRECTORY,
  localImageDirectory,
  localImageSrc,
} from 'utils';
import {
  LocalImagePickerComponent,
  type LocalImage,
} from './local-image-picker.component';

const IMAGE_FILE_PATTERN = /\.(gif|heic|heif|jpe?g|png|webp)$/i;

const isImageFile = (file: FileInfo): boolean =>
  file.type === 'file' && IMAGE_FILE_PATTERN.test(file.name);

/**
 * Asks the user to pick one of the photos this device saved locally.
 *
 * Reading the directory and presenting the modal are both workflow concerns, so
 * they live here rather than in the picker, which only renders what it is given
 * and reports back what was chosen. Mirrors how the gallery keeps its
 * filesystem access in a service. See GitHub issue #1168.
 */
@Injectable({ providedIn: 'root' })
export class LocalImagePickerService {
  private readonly modalController = inject(ModalController);

  /** The picked photo, or `undefined` when the user backed out. */
  async pick(): Promise<LocalImage | undefined> {
    const imageSelected = new EventEmitter<LocalImage>();
    const cancelled = new EventEmitter<void>();

    const modal = await this.modalController.create({
      component: LocalImagePickerComponent,
      componentProps: {
        // Ionic assigns componentProps onto the instance with Object.assign, so
        // a plain array would replace the component's input signal and the
        // template's `images()` read would throw. Hand over a callable signal
        // instead, the same way the app menu forwards its flags.
        images: signal(await this.loadImages()),
        imageSelected,
        cancelled,
      },
    });

    imageSelected.subscribe((image) => {
      void modal.dismiss(image, 'select');
    });
    cancelled.subscribe(() => {
      void modal.dismiss(undefined, 'cancel');
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<LocalImage>();

    return role === 'select' ? data : undefined;
  }

  /**
   * The signed-in user's locally saved photos, newest first. An unreadable
   * directory yields an empty list, which the picker reports as "no local
   * images found" - as does having nobody signed in to own one.
   *
   * Scoped to the user rather than the device so a shared browser profile does
   * not offer one account the photos of the previous one. See GitHub issue
   * #1328.
   */
  private async loadImages(): Promise<LocalImage[]> {
    try {
      const path = await localImageDirectory();

      if (!path) {
        return [];
      }

      const { files } = await Filesystem.readdir({
        path,
        directory: LOCAL_IMAGE_DIRECTORY,
      });

      return await Promise.all(
        files
          .filter(isImageFile)
          .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
          .map(async ({ name, uri }) => ({
            name,
            uri,
            src: await localImageSrc(name, uri),
          })),
      );
    } catch (error) {
      console.error('Error loading local images:', error);

      return [];
    }
  }
}
