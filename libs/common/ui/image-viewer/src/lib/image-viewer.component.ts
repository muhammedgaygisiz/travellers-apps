import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { register } from 'swiper/element/bundle';

// Swiper ships as a web component, so it is registered with the browser once at
// module load instead of being imported into the Angular component tree. The
// custom elements it defines are the reason this library needs
// CUSTOM_ELEMENTS_SCHEMA; that stays contained here.
register();

export type ImageViewerImage = {
  src: string;
  alt: string;
  /**
   * Label for the action offered at the bottom of the viewer. The bar is hidden
   * for photos that leave this unset, which is how the gallery hides "open
   * Bite" for photos whose filename does not identify a Bite.
   */
  actionLabel?: string;
};

/** The slice of Swiper's slide-change payload this component reads. */
type SwiperSlideChangeEvent = CustomEvent<[{ activeIndex: number }]>;

@Component({
  selector: 'image-viewer',
  templateUrl: 'image-viewer.component.html',
  styleUrl: 'image-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, TranslocoPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ImageViewerComponent {
  readonly images = input<ImageViewerImage[]>([]);
  readonly startIndex = input(0);

  readonly closed = output();
  /** Emits the index of the photo whose bottom action was chosen. */
  readonly actionSelected = output<number>();

  // Reopening the viewer at a different photo has to move the active slide, so
  // the index follows startIndex until the user swipes away from it.
  readonly activeIndex = linkedSignal(() => this.startIndex());

  readonly hasMultipleImages = computed(() => this.images().length > 1);

  readonly position = computed(
    () => `${this.activeIndex() + 1} / ${this.images().length}`,
  );

  readonly actionLabel = computed(
    () => this.images()[this.activeIndex()]?.actionLabel,
  );

  onSlideChange(event: Event): void {
    const [swiper] = (event as SwiperSlideChangeEvent).detail;

    this.activeIndex.set(swiper.activeIndex);
  }
}
