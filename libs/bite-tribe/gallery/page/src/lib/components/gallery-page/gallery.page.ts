import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { GalleryImage } from '../../integration/gallery.service';

@Component({
  selector: 'gallery-page',
  templateUrl: 'gallery.page.html',
  styleUrl: 'gallery.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class GalleryPage {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly images = input<GalleryImage[]>([]);
  readonly loading = input(false);
  readonly deleteAll = output();

  async confirmDeleteAll(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('delete-all-images'),
      message: this.transloco.translate(
        'are-you-sure-you-want-to-delete-all-local-images',
      ),
      buttons: [
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('delete'),
          role: 'destructive',
          handler: (): void => this.deleteAll.emit(),
        },
      ],
    });

    await alert.present();
  }
}
