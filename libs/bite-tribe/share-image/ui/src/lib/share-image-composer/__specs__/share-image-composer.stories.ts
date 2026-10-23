import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  signal,
} from '@angular/core';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import type { Bite } from 'model';
import { SHARE_IMAGE_FONT_FAMILY } from '../../draw-share-image';
import type { ShareImageFormat } from '../../share-image-content';
import {
  SHARE_IMAGE_LOGO_SRC,
  ShareImageComposerComponent,
} from '../share-image-composer.component';

// The app registers its icon set at bootstrap; Storybook has to do it itself or
// the "More options" chevron renders as an empty box.
addNecessaryIcons();

// Local, bundled demo image, so the reference never depends on a live photo.
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

const preload = (src: string): Promise<unknown> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = image.onerror = resolve;
    image.src = src;
  });

/**
 * Warms the browser cache with what the composer loads, and makes Loki wait
 * for it, before the composer is rendered. The composer fetches its photo off
 * the DOM, where Loki's own wait for `<img>` elements cannot see it; with the
 * cache warm, its own loads settle at once.
 */
@Component({
  selector: 'bt-share-image-composer-demo',
  imports: [ShareImageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ready()) {
      <bt-share-image-composer
        class="ion-page"
        [bite]="bite()"
        [format]="format()"
        [creatorName]="creatorName()"
        [shareImage]="shareImage"
        [saveImage]="saveImage"
      />
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      height: 100vh;
    }
  `,
})
class ShareImageComposerDemoComponent implements OnInit {
  readonly bite = input.required<Bite>();
  readonly format = input<ShareImageFormat>('story');
  readonly creatorName = input<string>();

  protected readonly ready = signal(false);
  protected readonly shareImage = (): Promise<void> => Promise.resolve();
  protected readonly saveImage = (): Promise<void> => Promise.resolve();

  ngOnInit(): void {
    const loading = Promise.all([
      preload(PEACH_IMAGE),
      preload(SHARE_IMAGE_LOGO_SRC),
      document.fonts?.load(`700 48px ${SHARE_IMAGE_FONT_FAMILY}`),
    ])
      .catch(() => undefined)
      .then(() => this.ready.set(true))
      // Let the composer's own start-up, now served from cache, finish too.
      .then(() => new Promise((resolve) => setTimeout(resolve, 500)));

    (window as LokiWindow).loki?.registerPendingPromise?.(loading);
  }
}

/**
 * The composer as the modal shows it: the preview, and below it a switch for
 * every field the Bite has (issue #1728). The wordmark has no switch.
 */
export default {
  title: 'Components/Share Image Composer',
  component: ShareImageComposerDemoComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: { bite: demoBite, format: 'story' },
} satisfies Meta<ShareImageComposerDemoComponent>;

type Story = StoryObj<ShareImageComposerDemoComponent>;

/** No public name: no name switch. */
export const Switches: Story = {};

/** A public name: its switch is offered, and starts off. */
export const WithNameSwitch: Story = {
  args: { creatorName: 'Super Mario' },
};

/** A Bite with no price and no rating offers neither switch. */
export const NoPriceOrRating: Story = {
  args: { bite: { ...demoBite, price: 0, rating: undefined } },
};
