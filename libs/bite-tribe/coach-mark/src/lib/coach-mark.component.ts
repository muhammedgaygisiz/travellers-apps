import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CoachMarkOverlayComponent } from 'common/ui/coach-mark';
import { CoachMarkStateService } from './coach-mark-state.service';
import type { CoachMarkSurface } from './coach-mark-surface';

const DEFAULT_DISMISS_KEY = 'coach-dismiss';

/**
 * Smart coach-mark wrapper each surface drops in once.
 *
 * On first visit — when {@link enabled} — it asks {@link CoachMarkStateService}
 * whether the surface's mark was already dismissed. If not, it measures the
 * anchor and shows the shared overlay; dismissing records the surface as seen so
 * the mark never returns and emits {@link dismissed} so a surface with more than
 * one mark can advance to the next.
 *
 * The anchor is taken from an `ElementRef`/element passed by the surface, or, for
 * elements owned by the shared page chrome (the create-Bite button), looked up
 * by a stable `data-testid`. A missing or unmeasurable anchor is not fatal: the
 * overlay falls back to a centred card.
 */
@Component({
  selector: 'bt-coach-mark',
  template: `
    @if (visible()) {
      <lib-coach-mark-overlay
        [anchor]="anchorRect()"
        [title]="titleKey() | transloco"
        [body]="bodyKey() | transloco"
        [dismissLabel]="dismissLabelKey() | transloco"
        (dismiss)="onDismiss()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoachMarkOverlayComponent, TranslocoPipe],
})
export class CoachMarkComponent {
  private readonly state = inject(CoachMarkStateService);

  surface = input.required<CoachMarkSurface>();
  titleKey = input.required<string>();
  bodyKey = input.required<string>();
  dismissLabelKey = input<string>(DEFAULT_DISMISS_KEY);

  /** Anchor element (or its ref) to spotlight; null centres the card. */
  anchor = input<ElementRef<HTMLElement> | HTMLElement | null>(null);
  /** Fallback lookup for chrome-owned anchors that a template ref cannot reach. */
  anchorTestId = input<string | null>(null);
  /** Lets a surface hold a mark back until an earlier one is dismissed. */
  enabled = input<boolean>(true);

  /** Fires when the user explicitly dismisses the mark. */
  dismissed = output<void>();
  /**
   * Fires once the mark's turn is over — after dismissal, or immediately when
   * there was nothing to show because the surface was already seen. A surface
   * with a second mark waits for this before enabling it, so two overlays never
   * appear at once and the queue still advances for a returning user.
   */
  settled = output<void>();

  protected readonly visible = signal(false);
  protected readonly anchorRect = signal<DOMRect | null>(null);

  private checked = false;

  constructor() {
    effect(() => {
      if (!this.enabled() || this.checked) {
        return;
      }

      this.checked = true;
      void this.maybeShow();
    });
  }

  private async maybeShow(): Promise<void> {
    if (await this.state.hasSeen(this.surface())) {
      this.settled.emit();
      return;
    }

    this.anchorRect.set(this.resolveAnchorRect());
    this.visible.set(true);
  }

  protected async onDismiss(): Promise<void> {
    this.visible.set(false);
    await this.state.markSeen(this.surface());
    this.dismissed.emit();
    this.settled.emit();
  }

  private resolveAnchorRect(): DOMRect | null {
    const element = this.resolveAnchorElement();
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    // A zero-size rect means the element is not laid out (or hidden); a centred
    // card reads better than a spotlight cut over nothing.
    return rect.width > 0 || rect.height > 0 ? rect : null;
  }

  private resolveAnchorElement(): HTMLElement | null {
    const anchor = this.anchor();
    if (anchor instanceof ElementRef) {
      return anchor.nativeElement;
    }
    if (anchor instanceof HTMLElement) {
      return anchor;
    }

    const testId = this.anchorTestId();
    return testId
      ? document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
      : null;
  }
}
