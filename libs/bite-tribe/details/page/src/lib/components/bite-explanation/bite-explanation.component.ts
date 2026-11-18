import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { BiteExplanation } from 'bite-tribe/details-data-access';

/** What the explanation modal shows (issue #2106, `UC-IBD` `R-2`, `R-5`, `R-6`). */
export type BiteExplanationState =
  | { kind: 'loading' }
  | { kind: 'ok'; explanation: BiteExplanation }
  | { kind: 'unknown' }
  | { kind: 'limit' }
  | { kind: 'error' };

/**
 * The AI explanation of a Bite's dish (issue #2106).
 *
 * Presentational only: `DetailsService` opens it, asks the backend and hands
 * the answer in as {@link state}. The title says a model wrote it, and the
 * disclaimer under the text is the app's own words rather than the model's,
 * so it is there whatever the model answered.
 */
@Component({
  selector: 'bt-bite-explanation',
  templateUrl: 'bite-explanation.component.html',
  styleUrl: 'bite-explanation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonSkeletonText,
    TranslocoPipe,
  ],
})
export class BiteExplanationComponent {
  /** The dish being explained, shown under the title. */
  readonly dishName = input('');

  readonly state = input<BiteExplanationState>({ kind: 'loading' });

  /** Asks again after a failed call. */
  readonly retry = output<void>();

  readonly closed = output<void>();
}
