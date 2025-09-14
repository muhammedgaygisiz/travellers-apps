import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  imageFromUrl = viewChild('imageFromUrl', { read: ElementRef });

  imageFileNew = linkedSignal(() => {
    const image = this.image() || '';

    if (this.isBase64()) {
      return this.dataURLtoFile(image) as File;
    }

    return null;
  });

  imgFromHtmlElem = effect(() => {
    const htmlElem = this.imageFromUrl()?.nativeElement as HTMLImageElement;

    if (htmlElem) {
      htmlElem.onload = (evt): void => {
        const file = this.extractFileFromHtmlImageElement(htmlElem);

        this.imageFileNew.set(file);
      };
    }
  });

  isBase64 = computed(() => {
    const image = this.image();

    return image?.startsWith('data:');
  });

  onLoadImageFailed(): void {
    console.error('Image load failed.');
  }

  onImageCropped(imageCroppedEvent: ImageCroppedEvent): void {
    this.currentCropBlob = imageCroppedEvent.blob;
  }

  async emitCroppedImage(): Promise<void> {
    if (!this.currentCropBlob) {
      this.onLoadImageFailed();
      return;
    }

    const croppedFile = new File([this.currentCropBlob], 'image.png', {
      type: this.currentCropBlob.type,
    });

    const reader = new FileReader();
    reader.onload = (): void => this.croppedImage.emit(reader.result as string);
    reader.readAsDataURL(croppedFile);
  }

  dataURLtoFile(dataurl: string): File {
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

  private extractFileFromHtmlImageElement(elem: HTMLImageElement): File {
    const canvas = document.createElement('canvas');
    canvas.width = elem.naturalWidth;
    canvas.height = elem.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.drawImage(elem, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');

    return this.dataURLtoFile(dataUrl) as File;
  }
}
