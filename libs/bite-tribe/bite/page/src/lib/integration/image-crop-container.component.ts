import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { ImageCropComponent } from '../components/image-crop/image-crop.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <image-crop
      [image]="service.editingBite()?.image"
      (croppedImage)="service.setEditedImage($event)"
    />
  `,
  imports: [ImageCropComponent],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class ImageCropContainer {
  service = inject(BiteService);
}
