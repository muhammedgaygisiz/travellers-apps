import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { NavController } from '@ionic/angular/standalone';
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
      [initialScrollTop]="service.scrollTop()"
      (deleteAll)="service.deleteAllImages()"
      (openBite)="openBite($event)"
    />
  `,
  imports: [GalleryPage],
})
export class GalleryContainer {
  readonly service = inject(GalleryService);
  private readonly navController = inject(NavController);

  private readonly page = viewChild.required(GalleryPage);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Gallery',
    });
    void this.service.loadImages();
  }

  /**
   * The grid position is captured on the way out rather than tracked while
   * scrolling: leaving for a Bite is the only moment it is needed, and the page
   * is rebuilt from scratch on the way back.
   */
  async openBite(biteId: string): Promise<void> {
    this.service.rememberScrollTop(await this.page().currentScrollTop());

    await this.navController.navigateForward(['bite', biteId]);
  }
}
