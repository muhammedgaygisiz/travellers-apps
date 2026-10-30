import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { loadBiteImageForCanvas } from 'bite-tribe-common/bite';
import type { Bite } from 'model';
import { getLocalizedCountryName } from 'utils';
import {
  SHARE_IMAGE_FONT_FAMILY,
  type ShareImageAssets,
} from '../draw-share-image';
import {
  applyFieldSwitches,
  availableFields,
  DEFAULT_FIELD_SWITCHES,
  toShareImageContent,
  type ShareImageCelebration,
  type ShareImageField,
  type ShareImageFieldSwitches,
  type ShareImageFormat,
} from '../share-image-content';

/** The label of each field's switch. */
const FIELD_LABEL_KEY: Record<ShareImageField, string> = {
  photo: 'share-image-field-photo',
  dishName: 'share-image-field-dish-name',
  place: 'share-image-field-place',
  price: 'share-image-field-price',
  rating: 'share-image-field-rating',
  creatorName: 'share-image-field-creator-name',
  celebration: 'share-image-field-celebration',
};
import { ShareImagePreviewComponent } from '../share-image-preview/share-image-preview.component';
import {
  DEFAULT_SHARE_IMAGE_STYLE,
  legibleTextColours,
  SHARE_IMAGE_BACKGROUNDS,
  SHARE_IMAGE_LAYOUT_IDS,
  textColourById,
  withLegibleText,
  type ShareImageBackgroundId,
  type ShareImageLayoutId,
  type ShareImageStyle,
  type ShareImageTextColourId,
} from '../share-image-style';

/**
 * How far the content may be scrolled, or how little may be hidden below,
 * before the "More options" cue goes away.
 */
const SCROLL_CUE_THRESHOLD = 24;

/**
 * Whether the "More options" cue should show: the content is still near its
 * top, and enough of it is hidden below to be worth scrolling to.
 */
export const hasMoreBelow = ({
  scrollTop,
  scrollHeight,
  clientHeight,
}: Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'>): boolean =>
  scrollTop < SCROLL_CUE_THRESHOLD &&
  scrollHeight - clientHeight - scrollTop > SCROLL_CUE_THRESHOLD;

/** How far a horizontal swipe on the preview must travel to change layout. */
const SWIPE_DISTANCE = 40;

/** The logo drawn beside the wordmark, served with the app's own assets. */
export const SHARE_IMAGE_LOGO_SRC = 'assets/icons/logo.svg';

/** The weights the template sets its text in. */
const FONT_WEIGHTS = [400, 600, 700];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = (): void => resolve(image);
    image.onerror = (): void => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

/**
 * Draws `image` once at its own size onto a canvas, which the template then
 * scales instead of the image (issue #1805).
 *
 * Android's WebView leaves out the masked parts of an SVG - the logo's
 * feathers - when it draws the SVG scaled to some sizes, roughly a fifth to a
 * half of its own, which is where the template draws the logo. A bitmap scales
 * without that. Without a 2D context the image is returned as it is.
 */
export const rasterise = (
  image: HTMLImageElement,
): HTMLCanvasElement | HTMLImageElement => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return image;
  }

  ctx.drawImage(image, 0, 0, image.width, image.height);
  return canvas;
};

/**
 * Waits for the template's font, because the canvas draws with whatever is
 * loaded at the moment it draws and does not repaint when a font arrives.
 * A browser without the Font Loading API draws with what it has.
 */
const loadFonts = async (): Promise<void> => {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }

  await Promise.all(
    FONT_WEIGHTS.map((weight) =>
      document.fonts.load(`${weight} 48px ${SHARE_IMAGE_FONT_FAMILY}`),
    ),
  );
};

/**
 * Turns one of the user's own Bites into a share image (`UC-SBS`).
 *
 * Shows a live preview of the template and hands the encoded image to
 * `saveImage` or `shareImage`, which own what happens to it - writing the file,
 * saving it and opening the share sheet are the caller's, so this stays a UI
 * component. Without `shareImage` there is no Share action.
 *
 * Opened as a modal: Ionic assigns its props onto the instance, so the inputs
 * arrive as signals, the way `LocalImagePickerService` hands its photos over.
 */
@Component({
  selector: 'bt-share-image-composer',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonText,
    IonTitle,
    IonToggle,
    IonToolbar,
    ShareImagePreviewComponent,
    TranslocoPipe,
  ],
  templateUrl: 'share-image-composer.component.html',
  styleUrl: 'share-image-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareImageComposerComponent implements OnInit {
  readonly bite = input.required<Bite>();
  readonly format = input<ShareImageFormat>('story');
  /**
   * The sharer's display name, passed only while their profile is public.
   * Without it there is no name switch (`UC-SBS` `R-8`).
   */
  readonly creatorName = input<string>();
  /**
   * The first this Bite was, if it was one. Without it there is no
   * celebration switch (issue #1837).
   */
  readonly celebration = input<ShareImageCelebration>();
  /** Shares the finished image. Resolves once the share sheet has closed. */
  readonly shareImage = input<(image: Blob) => Promise<void>>();
  /** Saves the finished image: to the photo library, or as a download. */
  readonly saveImage = input.required<(image: Blob) => Promise<void>>();
  readonly closed = output<void>();
  /**
   * A layout the user picked, by tapping or swiping, for the share funnel's
   * analytics (issue #1733). Not the one the composer opens on, which nobody
   * chose, and not a tap on the layout already showing.
   */
  readonly layoutChosen = output<ShareImageLayoutId>();
  /** The celebration switch flipped, for the share funnel's analytics. */
  readonly celebrationSwitched = output<boolean>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** Starts from the defaults on every open; nothing is remembered. */
  protected readonly switches = signal<ShareImageFieldSwitches>({
    ...DEFAULT_FIELD_SWITCHES,
  });

  /**
   * The active language's translations, once loaded. The canvas is drawn from
   * plain strings, so a line translated before its file arrived would stay the
   * bare key; reading this redraws it once the file is there.
   */
  private readonly translation = toSignal(this.transloco.selectTranslation());

  /** The celebration in the sharer's language, the country named in it too. */
  private readonly celebrationLine = computed(() => {
    const celebration = this.celebration();
    const lang = this.activeLang();

    if (!celebration || !this.translation()) {
      return undefined;
    }

    // Read with the active language, which `lang` tracks, so the line
    // follows a change of language.
    return celebration.moment === 'first-country'
      ? this.transloco.translate('share-image-celebration-first-country', {
          country: getLocalizedCountryName(celebration.countryCode, lang),
        })
      : this.transloco.translate('share-image-celebration-first-bite');
  });

  private readonly fullContent = computed(() =>
    toShareImageContent(
      this.bite(),
      this.activeLang(),
      this.creatorName(),
      this.celebrationLine(),
    ),
  );

  protected readonly fields = computed(() =>
    availableFields(this.fullContent()).map((field) => ({
      field,
      labelKey: FIELD_LABEL_KEY[field],
    })),
  );

  protected readonly content = computed(() =>
    applyFieldSwitches(this.fullContent(), this.switches()),
  );

  /** The layout and colours, chosen separately; nothing is remembered. */
  protected readonly imageStyle = signal<ShareImageStyle>({
    ...DEFAULT_SHARE_IMAGE_STYLE,
  });

  protected readonly layouts = SHARE_IMAGE_LAYOUT_IDS.map((id) => ({
    id,
    labelKey: `share-image-layout-${id}`,
  }));

  protected readonly backgrounds = SHARE_IMAGE_BACKGROUNDS.map(
    ({ id, stops }) => ({
      id,
      swatch: `linear-gradient(${stops[0]}, ${stops[1]})`,
      labelKey: `share-image-background-${id}`,
    }),
  );

  /** Only the text colours legible on the chosen background (`UC-SBS` `R-33`). */
  protected readonly textColours = computed(() =>
    legibleTextColours(this.imageStyle().background).map((id) => ({
      id,
      swatch: textColourById(id).color,
      labelKey: `share-image-text-colour-${id}`,
    })),
  );

  private swipeStart?: { x: number; y: number };
  protected readonly photo = signal<HTMLImageElement | undefined>(undefined);
  protected readonly logo = signal<ShareImageAssets['logo']>(undefined);
  protected readonly ready = signal(false);
  protected readonly photoFailed = signal(false);
  /** The action whose image is being handed over, if any. */
  protected readonly busy = signal<'share' | 'save' | undefined>(undefined);

  private readonly preview = viewChild(ShareImagePreviewComponent);
  private readonly ionContent = viewChild(IonContent);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Whether the customising controls are still out of view below the
   * preview, so the user is told they can scroll to them.
   */
  protected readonly moreBelow = signal(false);

  constructor() {
    // Measured again whenever the stage or the modal changes size, not once:
    // on a phone the stage is still laying out, and the modal still sliding
    // in, when it first renders, so an early measurement finds nothing below.
    effect((onCleanup) => {
      const stage = this.stage()?.nativeElement;

      // Absent in jsdom, where there is no layout to observe either.
      if (!stage || typeof ResizeObserver === 'undefined') {
        return;
      }

      const observer = new ResizeObserver(() => void this.updateMoreBelow());

      observer.observe(stage);
      observer.observe(this.host.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  async ngOnInit(): Promise<void> {
    const [photo, logo] = await Promise.allSettled([
      loadBiteImageForCanvas(this.bite()),
      loadImage(SHARE_IMAGE_LOGO_SRC),
      loadFonts(),
    ]);

    if (photo.status === 'fulfilled') {
      this.photo.set(photo.value);
    } else {
      console.error('The share image photo did not load:', photo.reason);
      this.photoFailed.set(true);
    }

    if (logo.status === 'fulfilled') {
      this.logo.set(rasterise(logo.value));
    }

    this.ready.set(true);
    // Once the stage has rendered, see whether anything is hidden below it.
    setTimeout(() => void this.updateMoreBelow(), 0);
  }

  protected async updateMoreBelow(): Promise<void> {
    const scroll = await this.scrollElement();

    if (scroll) {
      this.moreBelow.set(hasMoreBelow(scroll));
    }
  }

  /** Brings the first customising control into view. */
  protected async showOptions(): Promise<void> {
    const scroll = await this.scrollElement();
    // Looked up in the stage: the scroll element is in Ionic's shadow DOM,
    // where the slotted controls are not its descendants.
    const options =
      this.stage()?.nativeElement.querySelector<HTMLElement>('.layouts');

    if (scroll && options) {
      const top =
        options.getBoundingClientRect().top -
        scroll.getBoundingClientRect().top +
        scroll.scrollTop;

      await this.ionContent()?.scrollToPoint(0, top - 8, 300);
    }
  }

  /** The content's scroll element, or nothing where Ionic has not upgraded it. */
  private async scrollElement(): Promise<HTMLElement | undefined> {
    try {
      return await this.ionContent()?.getScrollElement();
    } catch {
      return undefined;
    }
  }

  protected setLayout(layout: ShareImageLayoutId): void {
    if (layout === this.imageStyle().layout) {
      return;
    }

    this.imageStyle.update((style) => ({ ...style, layout }));
    this.layoutChosen.emit(layout);
  }

  protected setBackground(background: ShareImageBackgroundId): void {
    // A text colour that is not legible on the new background gives way to
    // the first one that is.
    this.imageStyle.update((style) =>
      withLegibleText({ ...style, background }),
    );
  }

  protected setTextColour(text: ShareImageTextColourId): void {
    this.imageStyle.update((style) => ({ ...style, text }));
  }

  protected onSwipeStart(event: PointerEvent): void {
    this.swipeStart = { x: event.clientX, y: event.clientY };
  }

  /**
   * A cancelled press is the browser taking a vertical drag over as a scroll
   * (`touch-action: pan-y`); its coordinates say nothing about a swipe.
   */
  protected onSwipeCancel(): void {
    this.swipeStart = undefined;
  }

  /** A horizontal swipe on the preview steps to the next or previous layout. */
  protected onSwipeEnd(event: PointerEvent): void {
    if (this.swipeStart === undefined) {
      return;
    }

    const distance = event.clientX - this.swipeStart.x;
    const rise = event.clientY - this.swipeStart.y;
    this.swipeStart = undefined;

    if (
      Math.abs(distance) < SWIPE_DISTANCE ||
      Math.abs(rise) > Math.abs(distance)
    ) {
      return;
    }

    const ids = SHARE_IMAGE_LAYOUT_IDS;
    const current = ids.indexOf(this.imageStyle().layout);
    const step = distance < 0 ? 1 : -1;

    this.setLayout(ids[(current + step + ids.length) % ids.length]);
  }

  protected setSwitch(field: ShareImageField, on: boolean): void {
    this.switches.update((switches) => ({ ...switches, [field]: on }));

    if (field === 'celebration') {
      this.celebrationSwitched.emit(on);
    }
  }

  protected onShare(): Promise<void> {
    return this.handOver('share', this.shareImage());
  }

  protected onSave(): Promise<void> {
    return this.handOver('save', this.saveImage());
  }

  /** Exports the preview once and hands it to the action, one at a time. */
  private async handOver(
    action: 'share' | 'save',
    handler: ((image: Blob) => Promise<void>) | undefined,
  ): Promise<void> {
    const preview = this.preview();

    if (!preview || !handler || this.busy()) {
      return;
    }

    this.busy.set(action);

    try {
      await handler(await preview.toBlob());
    } finally {
      this.busy.set(undefined);
    }
  }
}
