import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { ImageCropPageComponent } from '../components/image-crop-page/image-crop-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <image-crop-page
      [image]="service.originalImage()"
      title="Crop image"
      crop="Crop"
      (croppedImage)="service.setCroppedImage($event)"
    />
  `,
  imports: [ImageCropPageComponent],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class ImageCropContainer {
  service = inject(BiteService);
}
