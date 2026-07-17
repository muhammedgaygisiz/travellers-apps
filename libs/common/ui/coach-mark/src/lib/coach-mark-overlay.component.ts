import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
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
 * of Transloco and reusable outside Bite Tribe; the smart wrapper in
 * `bite-tribe/coach-mark` resolves the copy and owns the seen state.
 *
 * The spotlight is a single element sized to the anchor with a very large spread
 * box-shadow, which darkens everything except the cut-out — cheaper and steadier
 * than compositing four separate scrim panels. When no anchor rect is available
 * the card is centred over a plain scrim instead.
 */
@Component({
  selector: 'lib-coach-mark-overlay',
  templateUrl: './coach-mark-overlay.component.html',
  styleUrl: './coach-mark-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton],
})
export class CoachMarkOverlayComponent {
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

  private readonly overlayId = ++nextOverlayId;
  readonly titleId = `coach-mark-title-${this.overlayId}`;
  readonly bodyId = `coach-mark-body-${this.overlayId}`;

  /** Breathing room the spotlight leaves around the highlighted element. */
  private readonly spotlightPadding = 8;

  /** Gap between the anchor and the explanation card. */
  private readonly cardGap = 16;

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

  readonly cardTop = computed<number | null>(() => {
    const rect = this.anchor();
    if (!rect) {
      return null;
    }

    return this.cardAbove()
      ? rect.top - this.cardGap
      : rect.bottom + this.cardGap;
  });

  constructor() {
    // Move focus to the dismiss action once rendered so keyboard and
    // screen-reader users land on the only way out of the overlay.
    afterNextRender(() => this.dismissButton()?.nativeElement.focus());
  }

  private viewportHeight(): number {
    return window.innerHeight || 0;
  }
}
