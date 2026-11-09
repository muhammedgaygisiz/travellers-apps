import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonInput, IonNote } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChipComponent } from 'common/ui/chip';
import type { PublicUser } from 'model';

/** Mirrors the limit `firestore.rules` enforces on `bites/{biteId}`. */
export const MAX_TAGGED_USERS = 10;

/** How many candidates are offered before the creator types anything. */
const UNFILTERED_CANDIDATE_COUNT = 6;

/**
 * The "Ate with" field of the Bite form (GitHub issue #1917): the BiteTribe
 * users the creator ate with, shown as removable chips, picked from the
 * accounts they follow.
 *
 * Presentational only. Which accounts may be offered - followed, public, not
 * blocked - is the container's to decide; the backend checks the same again
 * after the write (issue #1916).
 */
@Component({
  selector: 'bt-ate-with-picker',
  templateUrl: './ate-with-picker.component.html',
  styleUrl: './ate-with-picker.component.scss',
  imports: [IonInput, IonNote, TranslocoPipe, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AteWithPickerComponent {
  /** The accounts the creator may tag. */
  candidates = input<PublicUser[]>([]);

  /**
   * Profiles to name chips by when the uid is not among {@link candidates}:
   * somebody tagged earlier whom the creator has since unfollowed keeps the
   * tag, and their chip still needs a name.
   */
  knownUsers = input<PublicUser[]>([]);

  selectedIds = input<string[]>([]);

  selectedIdsChange = output<string[]>();

  readonly maxTaggedUsers = MAX_TAGGED_USERS;

  readonly query = signal('');

  readonly atLimit = computed(
    () => this.selectedIds().length >= MAX_TAGGED_USERS,
  );

  private readonly usersById = computed(
    () =>
      new Map(
        [...this.knownUsers(), ...this.candidates()].map((user) => [
          user.userId,
          user,
        ]),
      ),
  );

  /** The chips: every selected uid, named when its profile is known. */
  readonly selectedUsers = computed(() =>
    this.selectedIds().map((userId) => ({
      userId,
      displayName: this.usersById().get(userId)?.displayName || '',
    })),
  );

  /** Candidates not yet picked, filtered by display name. */
  readonly matches = computed(() => {
    const selected = new Set(this.selectedIds());
    const query = this.query().trim().toLowerCase();
    const open = this.candidates().filter(
      (user) => !selected.has(user.userId) && !!user.displayName,
    );

    if (!query) {
      return open.slice(0, UNFILTERED_CANDIDATE_COUNT);
    }

    return open.filter((user) =>
      user.displayName.toLowerCase().includes(query),
    );
  });

  onQuery(value: string | null | undefined): void {
    this.query.set(value ?? '');
  }

  add(userId: string): void {
    if (this.atLimit() || this.selectedIds().includes(userId)) {
      return;
    }

    this.selectedIdsChange.emit([...this.selectedIds(), userId]);
    this.query.set('');
  }

  remove(userId: string): void {
    this.selectedIdsChange.emit(
      this.selectedIds().filter((selected) => selected !== userId),
    );
  }
}
