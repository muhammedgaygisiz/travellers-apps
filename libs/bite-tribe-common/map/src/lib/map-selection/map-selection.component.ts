import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { SnapDrawerComponent } from '../snap-drawer/snap-drawer.component';

const WIDE_SCREEN_QUERY = '(min-width: 768px)';

/**
 * What a map shows for the marker the user tapped: a drawer dragged up from the
 * bottom on a phone, and a panel floating at the left of the map on a wide
 * screen, the way Google Maps shows a place. A bottom drawer on a wide screen
 * stretches the card into a banner (GitHub issue #1789).
 *
 * Every map that opens a marker renders this, so the home map and the search
 * map open a marker the same way (GitHub issue #2078). The content comes in as
 * an `<ng-template>` because only one of the two layouts is in the DOM at a
 * time, and a plain `<ng-content>` cannot be projected into either branch.
 */
@Component({
  selector: 'bt-map-selection',
  templateUrl: './map-selection.component.html',
  styleUrl: './map-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonIcon,
    NgTemplateOutlet,
    SnapDrawerComponent,
    TranslocoPipe,
  ],
  host: { '[class.is-side-panel]': 'isWideScreen()' },
})
export class MapSelectionComponent {
  /** The heading above the content, the name of what was tapped. */
  readonly heading = input.required<string>();

  /** The side panel's close button; the drawer closes by tapping the map. */
  readonly closeClick = output();

  protected readonly content = contentChild.required(TemplateRef);

  /**
   * Public so the host can move the map's zoom control clear of the panel,
   * which sits outside this component.
   */
  readonly isWideScreen = signal(false);

  constructor() {
    const query = window.matchMedia?.(WIDE_SCREEN_QUERY);
    if (!query) return;
    this.isWideScreen.set(query.matches);
    const onChange = (event: MediaQueryListEvent): void =>
      this.isWideScreen.set(event.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() =>
      query.removeEventListener('change', onChange),
    );
  }
}
