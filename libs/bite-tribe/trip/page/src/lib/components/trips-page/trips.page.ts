import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonAlert,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonText,
} from '@ionic/angular/standalone';
import type { OverlayEventDetail } from '@ionic/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { isOngoingTrip } from 'model';
import type { Trip, TripDraft } from 'model';
import { TripFormComponent } from '../trip-form/trip-form.component';
import { TripDatesPipe } from '../../pipes/trip-dates.pipe';

const DELETE = 'delete';
const CANCEL = 'cancel';

/** What the form was opened for: a new trip, or the trip being edited. */
type FormTarget = { mode: 'create' } | { mode: 'edit'; trip: Trip };

/**
 * The signed-in user's trips, newest start date first, with create, edit and
 * delete. Mirrors "My Bucket Lists" (issue #2353).
 */
@Component({
  selector: 'bt-trips-page',
  templateUrl: 'trips.page.html',
  styleUrl: 'trips.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonButton,
    IonText,
    IonModal,
    IonAlert,
    TranslocoPipe,
    TripFormComponent,
    TripDatesPipe,
  ],
})
export class TripsPage {
  private readonly transloco = inject(TranslocoService);

  /** Already in display order. */
  readonly trips = input<Trip[]>([]);
  /** False until the trips have been read, so the empty state waits for them. */
  readonly loaded = input(true);
  /** Today as `YYYY-MM-DD`, which decides what is ongoing. */
  readonly today = input.required<string>();

  readonly createTrip = output<TripDraft>();
  readonly updateTrip = output<{ trip: Trip; draft: TripDraft }>();
  readonly deleteTrip = output<string>();
  readonly gotoTrip = output<string>();

  protected readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  protected readonly formTarget = signal<FormTarget | null>(null);
  protected readonly tripToDelete = signal<string | null>(null);

  protected readonly isOngoing = isOngoingTrip;

  protected readonly deleteButtons = [
    { text: this.transloco.translate('cancel'), role: CANCEL },
    { text: this.transloco.translate('delete'), role: DELETE },
  ];

  protected editedTrip(target: FormTarget | null): Trip | undefined {
    return target?.mode === 'edit' ? target.trip : undefined;
  }

  openCreate(): void {
    this.formTarget.set({ mode: 'create' });
  }

  protected openEdit(trip: Trip, event: Event): void {
    event.stopPropagation();
    this.formTarget.set({ mode: 'edit', trip });
  }

  protected closeForm(): void {
    this.formTarget.set(null);
  }

  protected onSave(draft: TripDraft): void {
    const target = this.formTarget();

    if (target?.mode === 'edit') {
      this.updateTrip.emit({ trip: target.trip, draft });
    } else if (target) {
      this.createTrip.emit(draft);
    }

    this.formTarget.set(null);
  }

  protected openDeleteConfirmation(tripId: string, event: Event): void {
    event.stopPropagation();
    this.tripToDelete.set(tripId);
  }

  protected onDeleteDismiss(event: CustomEvent<OverlayEventDetail>): void {
    const tripId = this.tripToDelete();

    if (event.detail.role === DELETE && tripId) {
      this.deleteTrip.emit(tripId);
    }

    this.tripToDelete.set(null);
  }
}
