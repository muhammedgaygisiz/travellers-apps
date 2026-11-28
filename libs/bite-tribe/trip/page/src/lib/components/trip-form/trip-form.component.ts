import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { TRIP_TITLE_MAX_LENGTH, tripDraftError } from 'model';
import type { Trip, TripDraft } from 'model';

/**
 * Creates a trip, or edits one when `trip` is given. The draft is checked by
 * the same `tripDraftError` the rules mirror, and the reason is shown only once
 * the user has tried to save, so an empty form does not open on an error.
 */
@Component({
  selector: 'bt-trip-form',
  templateUrl: 'trip-form.component.html',
  styleUrl: 'trip-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A modal lays out its header and content only inside an `.ion-page`.
  host: { class: 'ion-page' },
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonText,
    TranslocoPipe,
  ],
})
export class TripFormComponent {
  readonly trip = input<Trip | undefined>();

  readonly save = output<TripDraft>();
  readonly cancelled = output<void>();

  protected readonly titleMaxLength = TRIP_TITLE_MAX_LENGTH;

  protected readonly title = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly attempted = signal(false);

  protected readonly draft = computed<TripDraft>(() => ({
    title: this.title(),
    startDate: this.startDate(),
    ...(this.endDate() ? { endDate: this.endDate() } : {}),
  }));

  protected readonly error = computed(() =>
    this.attempted() ? tripDraftError(this.draft()) : undefined,
  );

  constructor() {
    effect(() => {
      const trip = this.trip();
      this.title.set(trip?.title ?? '');
      this.startDate.set(trip?.startDate ?? '');
      this.endDate.set(trip?.endDate ?? '');
      this.attempted.set(false);
    });
  }

  protected onInput(
    field: 'title' | 'startDate' | 'endDate',
    event: Event,
  ): void {
    const value = String((event as CustomEvent).detail?.value ?? '');
    this[field].set(value);
  }

  protected submit(): void {
    this.attempted.set(true);

    if (tripDraftError(this.draft())) {
      return;
    }

    this.save.emit(this.draft());
  }
}
