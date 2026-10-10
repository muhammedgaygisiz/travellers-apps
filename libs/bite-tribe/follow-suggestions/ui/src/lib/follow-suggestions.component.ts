import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FollowSuggestion } from 'model';

/** How many placeholder cards the loading state draws. */
const SKELETON_CARDS = [0, 1, 2];

/**
 * A row of people to follow, each with a one-tap Follow button
 * (GitHub issue #1708).
 *
 * Presentational: the list, what is pending and whether it is loading all come
 * in, and every action goes out. The same component sits in the onboarding
 * finish step, the empty Following list and the home card, so it renders
 * nothing at all once there is nobody left to suggest - each surface reads an
 * empty list as "this section is not here", not as an empty state to explain.
 */
@Component({
  selector: 'bt-follow-suggestions',
  templateUrl: './follow-suggestions.component.html',
  styleUrl: './follow-suggestions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, IonSkeletonText, IonSpinner, TranslocoPipe],
})
export class FollowSuggestionsComponent {
  suggestions = input<FollowSuggestion[]>([]);
  pendingIds = input<ReadonlySet<string>>(new Set());
  loading = input(false);
  /** Shows a close button that emits {@link dismiss}. */
  dismissible = input(false);
  /** Makes each card open the person's profile through {@link openProfile}. */
  linkable = input(false);
  /**
   * Centres the heading and the row, for a surface whose own content is
   * centred - the onboarding finish step and the empty Following list. Home
   * leaves it off: its feed is a start-aligned grid, and a centred row there
   * would be the one thing out of line.
   */
  centered = input(false);

  follow = output<FollowSuggestion>();
  openProfile = output<string>();
  dismiss = output<void>();
  /**
   * Once per instance, the first time the list renders with somebody in it,
   * with how many people it showed. One instance is one visit to a surface,
   * which is the unit `follow_suggestions_shown` counts.
   */
  shown = output<number>();

  protected readonly skeletonCards = SKELETON_CARDS;
  protected readonly erroredImages = signal<ReadonlySet<string>>(new Set());

  private reportedShown = false;

  constructor() {
    effect(() => {
      const count = this.suggestions().length;

      if (count > 0 && !this.reportedShown) {
        this.reportedShown = true;
        untracked(() => this.shown.emit(count));
      }
    });
  }

  protected onImageError(userId: string): void {
    this.erroredImages.update((ids) => new Set(ids).add(userId));
  }

  protected onOpen(userId: string): void {
    if (this.linkable()) {
      this.openProfile.emit(userId);
    }
  }
}
