import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { GalleryPage } from '../components/gallery-page/gallery.page';
import { GalleryService } from './gallery.service';

@Component({
  selector: 'gallery-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <gallery-page
      class="ion-page"
      [images]="service.images()"
      [loading]="service.loading()"
      (deleteAll)="service.deleteAllImages()"
    />
  `,
  imports: [GalleryPage],
})
export class GalleryContainer {
  readonly service = inject(GalleryService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Gallery',
    });
    void this.service.loadImages();
  }
}
