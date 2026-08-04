import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Reports a feed synchronization that did not deliver bites, next to the feed
 * rather than in place of it.
 *
 * The Home skeleton used to be the only sign that something was happening, so a
 * load that never answered was indistinguishable from one still in flight
 * (issue #1230). This card is what the loading state resolves into: it names the
 * failure and offers the one action that can fix it, while whatever bites are
 * already known stay on screen underneath.
 */
@Component({
  selector: 'bt-feed-error-card',
  templateUrl: 'feed-error-card.component.html',
  imports: [
    IonCard,
    IonCardContent,
    IonIcon,
    IonText,
    IonButton,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedErrorCardComponent {
  readonly retryClick = output<void>();
}
