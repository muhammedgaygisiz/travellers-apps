import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DaySchedule } from 'model';
import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonLabel,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

const DAYS: DaySchedule['day'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Raw, partially-typed values as produced by the reactive form. */
type RawTimeRange = { from?: string | null; to?: string | null };
type RawDayEntry = {
  day: DaySchedule['day'];
  isOpen?: boolean | null;
  timeRanges?: RawTimeRange[] | null;
};

@Component({
  selector: 'bt-opening-hours',
  templateUrl: 'opening-hours.component.html',
  styleUrl: 'opening-hours.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonLabel,
    IonCheckbox,
    IonButton,
    IonIcon,
    IonInput,
    TranslocoPipe,
  ],
})
export class OpeningHoursComponent {
  private readonly formBuilder = inject(FormBuilder);

  /** The rows of {@link form}, in order. Each row's label reads its day from here. */
  protected readonly days = DAYS;

  openingHours = input<DaySchedule[]>();

  /**
   * Shows the standalone "Save" button. The edit-restaurant page persists
   * opening hours on their own via {@link submitOpeningHours}, so it keeps the
   * button. The create page submits everything through its own single Save and
   * reads the schedule back via {@link getOpeningHours}, so it hides it.
   */
  readonly showSubmit = input<boolean>(true);

  readonly submitOpeningHours = output<DaySchedule[]>();

  readonly form = this.formBuilder.group({
    schedule: this.formBuilder.array(
      DAYS.map((day) =>
        this.formBuilder.group({
          day: [day],
          isOpen: [false],
          timeRanges: this.formBuilder.array([]),
        }),
      ),
    ),
  });

  get schedule(): FormArray {
    return this.form.get('schedule') as FormArray;
  }

  initOpeningHours = effect(() => {
    const hours = this.openingHours();

    DAYS.forEach((day, index) => {
      const dayGroup = this.schedule.at(index);
      const existing = hours?.find((h) => h.day === day);
      const timeRanges = dayGroup.get('timeRanges') as FormArray;
      timeRanges.clear();

      if (existing) {
        dayGroup.patchValue({ isOpen: existing.isOpen });
        existing.timeRanges.forEach((range) => {
          timeRanges.push(
            this.formBuilder.group({
              from: [range.from],
              to: [range.to],
            }),
          );
        });
      } else {
        dayGroup.patchValue({ isOpen: false });
      }
    });
  });

  private readonly formChanges = toSignal(this.form.valueChanges, {
    initialValue: null,
  });

  /**
   * Whether the form still holds the stored schedule, read the way it is
   * filled: a day the restaurant has no entry for is closed with no times.
   * Its Save stays disabled until it does not (GitHub issue #2222).
   */
  protected readonly unchanged = computed(() => {
    this.formChanges();
    const stored = this.openingHours() ?? [];
    const asStored = DAYS.map((day) => {
      const entry = stored.find((hours) => hours.day === day);

      return {
        day,
        isOpen: entry?.isOpen ?? false,
        timeRanges: (entry?.timeRanges ?? []).map(({ from, to }) => ({
          from,
          to,
        })),
      };
    });

    return JSON.stringify(this.getOpeningHours()) === JSON.stringify(asStored);
  });

  getTimeRanges(dayIndex: number): FormArray {
    return this.schedule.at(dayIndex).get('timeRanges') as FormArray;
  }

  addTimeRange(dayIndex: number): void {
    this.getTimeRanges(dayIndex).push(
      this.formBuilder.group({
        from: [''],
        to: [''],
      }),
    );
  }

  removeTimeRange(dayIndex: number, rangeIndex: number): void {
    this.getTimeRanges(dayIndex).removeAt(rangeIndex);
  }

  /** Returns the current schedule. Read by the create page at save time. */
  getOpeningHours(): DaySchedule[] {
    const scheduleValue = (this.form.value.schedule ?? []) as RawDayEntry[];
    return scheduleValue.map((entry) => ({
      day: entry.day,
      isOpen: entry.isOpen ?? false,
      timeRanges: (entry.timeRanges ?? []).map((r) => ({
        from: r.from ?? '',
        to: r.to ?? '',
      })),
    }));
  }

  save(): void {
    this.submitOpeningHours.emit(this.getOpeningHours());
  }
}
