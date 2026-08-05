import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ImageViewerComponent, ImageViewerImage } from 'common/ui/image-viewer';
import { PageComponent } from 'common/ui/page';
import { GalleryImage } from '../../integration/gallery.service';

@Component({
  selector: 'gallery-page',
  templateUrl: 'gallery.page.html',
  styleUrl: 'gallery.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ImageViewerComponent,
    PageComponent,
    IonButton,
    IonContent,
    IonIcon,
    IonModal,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class GalleryPage {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);

  private readonly content = viewChild(IonContent);
  private readonly viewer = viewChild(IonModal);

  readonly images = input<GalleryImage[]>([]);
  readonly loading = input(false);
  /** Grid offset to return to after coming back from a Bite. */
  readonly initialScrollTop = input(0);

  readonly deleteAll = output();
  readonly openBite = output<string>();

  readonly viewerIndex = signal<number | undefined>(undefined);

  readonly viewerImages = computed<ImageViewerImage[]>(() =>
    this.images().map(({ src, biteId }) => ({
      src,
      alt: this.transloco.translate('locally-saved-image'),
      actionLabel: biteId ? this.transloco.translate('open-bite') : undefined,
    })),
  );

  private scrollRestored = false;

  constructor() {
    // The offset only means something once the tiles are on screen, and the
    // list arrives a tick after the page does, so the restore waits for both
    // the images and the render that lays them out.
    effect(() => {
      const scrollTop = this.initialScrollTop();

      if (this.scrollRestored || scrollTop <= 0 || this.images().length === 0) {
        return;
      }

      this.scrollRestored = true;

      afterNextRender(() => void this.content()?.scrollToPoint(0, scrollTop), {
        injector: this.injector,
      });
    });
  }

  openViewer(index: number): void {
    this.viewerIndex.set(index);
  }

  closeViewer(): void {
    this.viewerIndex.set(undefined);
  }

  /**
   * Leaves for the Bite behind the photo at `index`.
   *
   * The viewer is dismissed through the modal itself and awaited, rather than
   * by clearing the signal `isOpen` is bound to and navigating in the same
   * breath. That route only asks for a dismissal on the next change detection
   * pass, which the navigation can outrun, leaving the overlay on screen above
   * the Bite - and its close button belonging to a page that is no longer the
   * active one, so only a backdrop tap still works. See GitHub issue #1232.
   */
  async goToBite(index: number): Promise<void> {
    const biteId = this.images()[index]?.biteId;

    if (!biteId) {
      return;
    }

    await this.viewer()?.dismiss();
    this.closeViewer();
    this.openBite.emit(biteId);
  }

  async currentScrollTop(): Promise<number> {
    const scrollElement = await this.content()?.getScrollElement();

    return scrollElement?.scrollTop ?? 0;
  }

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
