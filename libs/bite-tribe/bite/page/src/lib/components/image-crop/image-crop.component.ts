import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'image-crop',
  templateUrl: './image-crop.component.html',
  imports: [ImageCropperComponent],
  styles: `
    :host {
      height: 100%;
    }

    .h-100 {
      height: 100%;
    }
  `,
})
export class ImageCropComponent {
  image = input<string>();

  croppedImage = output<string>();

  imageFile = computed((): File => {
    const image = this.image() || '';
    return this.dataURLtoFile(image) as File;
  });

  async onImageCropped(event: ImageCroppedEvent) {
    if (!event.blob) {
      this.onLoadImageFailed();
      return;
    }

    const croppedFile = new File([event.blob], 'image.png', {
      type: event.blob.type,
    });

    const reader = new FileReader();
    reader.onload = () => {
      this.croppedImage.emit(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
  }

  onLoadImageFailed() {
    console.error('Image load failed.');
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
