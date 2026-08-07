import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { BiteSkeletonComponent } from '../bite-skeleton/bite-skeleton.component';

@Component({
  selector: 'bt-bite-skeleton-list',
  templateUrl: './bite-skeleton-list.component.html',
  styleUrl: './bite-skeleton-list.component.scss',
  imports: [BiteSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteSkeletonListComponent {
  /** How many skeletons to stand in for below the desktop breakpoint. */
  readonly count = input(3);

  /**
   * How many to show at desktop widths. A caller that lays the skeletons out in
   * a grid fits more per screen than a single column does, so it asks for more;
   * the feed asks for six, which fills two rows of three.
   *
   * Defaults to {@link count}, so a caller that does not change layout by width
   * shows the same number everywhere. See GitHub issue #1250.
   */
  readonly desktopCount = input(3);

  /**
   * Every skeleton is rendered at all widths and the extras are hidden by a
   * media query, so the count changes with the viewport without a resize
   * listener — the same approach the desktop layout uses throughout.
   */
  protected readonly skeletons = computed(() =>
    Array.from(
      { length: Math.max(this.count(), this.desktopCount()) },
      (_, index) => index,
    ),
  );

  /** True for a skeleton that only appears once the desktop layout takes over. */
  protected readonly isDesktopOnly = (index: number): boolean =>
    index >= this.count();
}
