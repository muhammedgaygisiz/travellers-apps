import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { SHARE_IMAGE_FONT_FAMILY } from '../draw-share-image';
import {
  applyFieldSwitches,
  availableFields,
  DEFAULT_FIELD_SWITCHES,
  toShareImageContent,
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
 * `shareImage`, which owns what happens to it - writing the file and opening
 * the share sheet are the caller's, so this stays a UI component.
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
  /** Shares the finished image. Resolves once the share sheet has closed. */
  readonly shareImage = input.required<(image: Blob) => Promise<void>>();
  readonly closed = output<void>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** Starts from the defaults on every open; nothing is remembered. */
  protected readonly switches = signal<ShareImageFieldSwitches>({
    ...DEFAULT_FIELD_SWITCHES,
  });

  private readonly fullContent = computed(() =>
    toShareImageContent(this.bite(), this.activeLang(), this.creatorName()),
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

  private swipeStartX?: number;
  protected readonly photo = signal<HTMLImageElement | undefined>(undefined);
  protected readonly logo = signal<HTMLImageElement | undefined>(undefined);
  protected readonly ready = signal(false);
  protected readonly photoFailed = signal(false);
  protected readonly sharing = signal(false);

  private readonly preview = viewChild(ShareImagePreviewComponent);
  private readonly ionContent = viewChild(IonContent);

  /**
   * Whether the customising controls are still out of view below the
   * preview, so the user is told they can scroll to them.
   */
  protected readonly moreBelow = signal(false);

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
      this.logo.set(logo.value);
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
    const options = (await this.scrollElement())?.querySelector<HTMLElement>(
      '.layouts',
    );

    if (options) {
      await this.ionContent()?.scrollToPoint(0, options.offsetTop - 8, 300);
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
    this.imageStyle.update((style) => ({ ...style, layout }));
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
    this.swipeStartX = event.clientX;
  }

  /** A horizontal swipe on the preview steps to the next or previous layout. */
  protected onSwipeEnd(event: PointerEvent): void {
    if (this.swipeStartX === undefined) {
      return;
    }

    const distance = event.clientX - this.swipeStartX;
    this.swipeStartX = undefined;

    if (Math.abs(distance) < SWIPE_DISTANCE) {
      return;
    }

    const ids = SHARE_IMAGE_LAYOUT_IDS;
    const current = ids.indexOf(this.imageStyle().layout);
    const step = distance < 0 ? 1 : -1;

    this.setLayout(ids[(current + step + ids.length) % ids.length]);
  }

  protected setSwitch(field: ShareImageField, on: boolean): void {
    this.switches.update((switches) => ({ ...switches, [field]: on }));
  }

  protected async onShare(): Promise<void> {
    const preview = this.preview();

    if (!preview || this.sharing()) {
      return;
    }

    this.sharing.set(true);

    try {
      await this.shareImage()(await preview.toBlob());
    } finally {
      this.sharing.set(false);
    }
  }
}
