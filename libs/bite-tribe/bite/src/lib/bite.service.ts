import { inject, Injectable, signal } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Platform } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class BiteService {
  imageBase64 = signal<string | null>(null);
  private readonly platform = inject(Platform);

  isWeb = signal(!this.platform.is('hybrid'));

  async takePhoto() {
    if (this.platform.is('hybrid')) {
      this.imageBase64.set(await this.takePictureOnNative());
      return;
    }

    this.imageBase64.set(await this.uploadFromLibrary());
  }

  private async takePictureOnNative() {
    try {
      await Camera.requestPermissions();
      await Camera.requestPermissions();

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      return `data:image/${image.format};base64,${image.base64String}`;
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    }
  }

  private async uploadFromLibrary() {
    return null;
  }

  saveImageFromFileUpload(result: string) {
    this.imageBase64.set(result);
  }
}
