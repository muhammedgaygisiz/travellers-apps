import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import {
  base64ToFile,
  extractFileFromHtmlImageElement,
} from 'image-compression';

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
      return base64ToFile(image);
    }

    return null;
  });

  imgFromHtmlElem = effect(() => {
    const htmlElem = this.imageFromUrl()?.nativeElement as HTMLImageElement;

    if (htmlElem) {
      htmlElem.onload = (evt): void => {
        const file = extractFileFromHtmlImageElement(htmlElem);

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
}
