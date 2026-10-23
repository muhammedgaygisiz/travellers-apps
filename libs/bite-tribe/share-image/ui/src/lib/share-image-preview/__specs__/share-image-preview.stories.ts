import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { loadBiteImageForCanvas } from 'bite-tribe-common/bite';
import type { Bite } from 'model';
import { SHARE_IMAGE_FONT_FAMILY } from '../../draw-share-image';
import { toShareImageContent } from '../../share-image-content';
import { SHARE_IMAGE_LOGO_SRC } from '../../share-image-composer/share-image-composer.component';
import { ShareImagePreviewComponent } from '../share-image-preview.component';

// Local, bundled demo image served from the Storybook static build's /assets
// dir, so the reference never depends on a live Storage photo.
const PEACH_IMAGE = 'assets/demo/bite-demo.png';

const demoBite: Bite = {
  id: 'bite1',
  name: 'Peaches',
  image: '',
  imagePath: PEACH_IMAGE,
  place: "Sam's",
  city: 'Bern',
  price: 14.5,
  currency: 'CHF',
  rating: 4.5,
  position: { latitude: 46.948, longitude: 7.4474 },
};

type LokiWindow = Window & {
  loki?: { registerPendingPromise?: (promise: Promise<unknown>) => void };
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = (): void => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/**
 * Loads what the composer loads - the photo, the logo and the font - before
 * the preview draws, and makes Loki wait for it. The photo is fetched off the
 * DOM, so Loki's own wait for `<img>` elements cannot see it.
 */
@Component({
  selector: 'bt-share-image-preview-demo',
  imports: [ShareImagePreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ready()) {
      <bt-share-image-preview
        [content]="content()"
        [photo]="photo()"
        [logo]="logo()"
        label="Preview of the image that will be shared"
      />
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 360px;
      margin: 16px auto;
    }
  `,
})
class ShareImagePreviewDemoComponent implements OnInit {
  readonly bite = input.required<Bite>();
  readonly withPhoto = input(true);

  protected readonly content = signal(toShareImageContent(demoBite, 'en'));
  protected readonly photo = signal<HTMLImageElement | undefined>(undefined);
  protected readonly logo = signal<HTMLImageElement | undefined>(undefined);
  protected readonly ready = signal(false);

  ngOnInit(): void {
    this.content.set(toShareImageContent(this.bite(), 'en'));

    const loading = Promise.allSettled([
      this.withPhoto()
        ? loadBiteImageForCanvas(this.bite())
        : Promise.reject(new Error('no photo')),
      loadImage(SHARE_IMAGE_LOGO_SRC),
      document.fonts?.load(`700 48px ${SHARE_IMAGE_FONT_FAMILY}`),
    ]).then(([photo, logo]) => {
      if (photo.status === 'fulfilled') {
        this.photo.set(photo.value);
      }
      if (logo.status === 'fulfilled') {
        this.logo.set(logo.value);
      }
      this.ready.set(true);
    });

    (window as LokiWindow).loki?.registerPendingPromise?.(loading);
  }
}

export default {
  title: 'Components/Share Image',
  component: ShareImagePreviewDemoComponent,
  args: { bite: demoBite, withPhoto: true },
} satisfies Meta<ShareImagePreviewDemoComponent>;

type Story = StoryObj<ShareImagePreviewDemoComponent>;

/** Every field the first template draws. */
export const Story916: Story = {
  name: 'Story 9:16',
};

/** A dish and a restaurant too long for their lines, cut with an ellipsis. */
export const LongNames: Story = {
  args: {
    bite: {
      ...demoBite,
      name: 'Slow-roasted white peaches with burnt honey, thyme crumble and a scoop of sheep milk ice cream',
      place: 'Restaurant zum Goldenen Pfirsich am alten Marktplatz',
      city: 'Bern',
    },
  },
};

/** No price: the rating moves to the start of its row. */
export const NoPrice: Story = {
  args: { bite: { ...demoBite, price: 0 } },
};

/** No rating: the price stands alone. */
export const NoRating: Story = {
  args: { bite: { ...demoBite, rating: undefined } },
};

/** Neither price nor rating: the row is left out. */
export const NoPriceOrRating: Story = {
  args: { bite: { ...demoBite, price: 0, rating: undefined } },
};

/** The photo could not be loaded: a panel with the logo takes its place. */
export const PhotoMissing: Story = {
  args: { withPhoto: false },
};

/** Markup in a dish name is drawn as the literal characters. */
export const MarkupInName: Story = {
  args: { bite: { ...demoBite, name: '<img src=x onerror=alert(1)>' } },
};
