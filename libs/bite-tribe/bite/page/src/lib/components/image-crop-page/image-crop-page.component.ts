import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'image-crop-page',
  templateUrl: './image-crop-page.component.html',
  styleUrl: './image-crop-page.component.scss',
  imports: [ImageCropperComponent, PageComponent, IonContent, IonButton],
  styles: `
    :host {
      height: 100%;
    }

    .h-100 {
      height: 100%;
    }
  `,
})
export class ImageCropPageComponent {
  image = input<string>();

  title = input<string>('Crop image');

  crop = input<string>('Crop');

  croppedImage = output<string>();

  currentCropBlob: Blob | null | undefined;

  imageFile = computed((): File => {
    const image = this.image() || '';
    return this.dataURLtoFile(image) as File;
  });

  onLoadImageFailed() {
    console.error('Image load failed.');
  }

  onImageCropped(imageCroppedEvent: ImageCroppedEvent) {
    this.currentCropBlob = imageCroppedEvent.blob;
  }

  async emitCroppedImage() {
    if (!this.currentCropBlob) {
      this.onLoadImageFailed();
      return;
    }

    const croppedFile = new File([this.currentCropBlob], 'image.png', {
      type: this.currentCropBlob.type,
    });

    const reader = new FileReader();
    reader.onload = () => this.croppedImage.emit(reader.result as string);
    reader.readAsDataURL(croppedFile);
  }

  dataURLtoFile(dataurl: string) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[arr.length - 1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], new Date().toISOString(), { type: mime });
  }
}
