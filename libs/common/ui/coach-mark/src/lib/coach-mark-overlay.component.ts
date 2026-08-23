import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';

let nextOverlayId = 0;

/**
 * Presentational coach-mark overlay.
 *
 * It dims the surface and cuts a spotlight over the {@link anchor} element, then
 * shows an explanation card that must be dismissed with its explicit action —
 * tapping the dimmed backdrop does nothing, so a mark is never dismissed by
 * accident. All visible text arrives through inputs, keeping the component free
 * of Transloco and reusable outside BiteTribe; the smart wrapper in
 * `bite-tribe/coach-mark` resolves the copy and owns the seen state.
 *
 * The spotlight is a single element sized to the anchor with a very large spread
 * box-shadow, which darkens everything except the cut-out — cheaper and steadier
 * than compositing four separate scrim panels. When no anchor rect is available
 * the card is centred over a plain scrim instead.
 *
 * The card is placed next to the anchor but always clamped inside the safe
 * viewport, so an anchor sitting at (or past) a screen edge can never push the
 * card — and with it the only dismiss action — off screen or under the system
 * bars.
 */
@Component({
  selector: 'lib-coach-mark-overlay',
  templateUrl: './coach-mark-overlay.component.html',
  styleUrl: './coach-mark-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton],
})
export class CoachMarkOverlayComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  /** Viewport-space rect of the highlighted element, or null to centre the card. */
  anchor = input<DOMRect | null>(null);
  title = input<string>('');
  body = input<string>('');
  dismissLabel = input<string>('');

  dismiss = output<void>();

  private readonly dismissButton = viewChild<
    IonButton,
    ElementRef<HTMLElement>
  >('dismissButton', {
    read: ElementRef,
  });

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');

  private readonly overlayId = ++nextOverlayId;
  readonly titleId = `coach-mark-title-${this.overlayId}`;
  readonly bodyId = `coach-mark-body-${this.overlayId}`;

  /** Breathing room the spotlight leaves around the highlighted element. */
  private readonly spotlightPadding = 8;

  /** Gap between the anchor and the explanation card. */
  private readonly cardGap = 16;

  /** Minimum breathing room between the card and the safe viewport edges. */
  private readonly cardMargin = 16;

  /** Card height, measured once laid out; drives the clamp against the edges. */
  private readonly cardHeight = signal(0);

  readonly hasAnchor = computed(() => this.anchor() !== null);

  readonly spotlightTop = computed(
    () => (this.anchor()?.top ?? 0) - this.spotlightPadding,
  );
  readonly spotlightLeft = computed(
    () => (this.anchor()?.left ?? 0) - this.spotlightPadding,
  );
  readonly spotlightWidth = computed(
    () => (this.anchor()?.width ?? 0) + this.spotlightPadding * 2,
  );
  readonly spotlightHeight = computed(
    () => (this.anchor()?.height ?? 0) + this.spotlightPadding * 2,
  );

  /**
   * Places the card below the anchor when it sits in the upper part of the
   * viewport, and above it otherwise, so the card stays on screen and does not
   * cover the very thing it explains.
   */
  readonly cardAbove = computed(() => {
    const rect = this.anchor();
    if (!rect) {
      return false;
    }

    return rect.bottom >= this.viewportHeight() * 0.55;
  });

  /**
   * Top edge of the card in viewport space: next to the anchor where there is
   * room, clamped into the safe viewport otherwise. Without the clamp an anchor
   * scrolled past an edge would place the card — and its dismiss button — off
   * screen or behind the system bars.
   */
  readonly cardTop = computed<number | null>(() => {
    const rect = this.anchor();
    if (!rect) {
      return null;
    }

    const height = this.cardHeight();
    const preferred = this.cardAbove()
      ? rect.top - this.cardGap - height
      : rect.bottom + this.cardGap;

    const minTop = this.safeAreaInset('top') + this.cardMargin;
    const maxTop =
      this.viewportHeight() -
      this.safeAreaInset('bottom') -
      this.cardMargin -
      height;

    // On a viewport too short for the card, favour the top edge so the title
    // and body stay readable and the card scrolls off the bottom instead.
    return maxTop <= minTop
      ? minTop
      : Math.min(Math.max(preferred, minTop), maxTop);
  });

  constructor() {
    afterNextRender(() => {
      // The card is still growing at this point — `ion-button` is a custom
      // element that gains its height once defined — so track the box rather
      // than taking a single measurement that would clamp against a too-small
      // height and let the card overflow the edge anyway.
      this.observeCardHeight();

      // Move focus to the dismiss action once rendered so keyboard and
      // screen-reader users land on the only way out of the overlay.
      this.dismissButton()?.nativeElement.focus();
    });
  }

  private observeCardHeight(): void {
    const element = this.card()?.nativeElement;
    if (!element) {
      return;
    }

    this.cardHeight.set(element.offsetHeight);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    // `ResizeObserver` is not patched by zone.js, so the write has to re-enter
    // the zone for the new position to actually reach the DOM.
    const observer = new ResizeObserver(() =>
      this.zone.run(() => this.cardHeight.set(element.offsetHeight)),
    );
    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private viewportHeight(): number {
    return window.innerHeight || 0;
  }

  /**
   * Ionic mirrors the `env(safe-area-inset-*)` values onto these custom
   * properties; they resolve to 0 on browsers and platforms without insets.
   */
  private safeAreaInset(edge: 'top' | 'bottom'): number {
    const value = getComputedStyle(document.documentElement).getPropertyValue(
      `--ion-safe-area-${edge}`,
    );

    return Number.parseFloat(value) || 0;
  }
}
