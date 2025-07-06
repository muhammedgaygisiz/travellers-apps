import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { ImageCropPageComponent } from '../components/image-crop-page/image-crop-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <image-crop-page
      [image]="service.editingBite()?.image"
      (croppedImage)="service.setEditedImage($event)"
    />
  `,
  imports: [ImageCropPageComponent],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class ImageCropContainer {
  service = inject(BiteService);
}
