import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { getIonicConfig } from 'utils';
import type { Trip, TripDraft } from 'model';
import { TripFormComponent } from '../trip-form.component';

const trip: Trip = {
  id: 'trip-1',
  userId: 'owner',
  title: 'Southeast Asia',
  startDate: '2026-12-01',
  endDate: '2027-01-15',
};

const type = (
  fixture: ComponentFixture<TripFormComponent>,
  testId: string,
  value: string,
): void => {
  const input = fixture.nativeElement.querySelector(
    `[data-testid="${testId}"]`,
  ) as HTMLElement;
  input.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
};

const click = (
  fixture: ComponentFixture<TripFormComponent>,
  testId: string,
): void => {
  (
    fixture.nativeElement.querySelector(
      `[data-testid="${testId}"]`,
    ) as HTMLElement
  ).click();
};

describe(TripFormComponent.name, () => {
  let fixture: ComponentFixture<TripFormComponent>;
  let saved: TripDraft[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });
    fixture = TestBed.createComponent(TripFormComponent);
    saved = [];
    fixture.componentInstance.save.subscribe((draft) => saved.push(draft));
    await fixture.whenStable();
  });

  const error = (): string | undefined =>
    fixture.nativeElement
      .querySelector('[data-testid="trip-form-error"]')
      ?.textContent.trim();

  it('opens without an error', () => {
    expect(error()).toBeUndefined();
  });

  it('saves a new trip without an end date', async () => {
    type(fixture, 'trip-form-title', '  Japan ');
    type(fixture, 'trip-form-start-date', '2027-03-01');
    click(fixture, 'trip-form-save');
    await fixture.whenStable();

    expect(saved).toEqual([{ title: '  Japan ', startDate: '2027-03-01' }]);
  });

  it('refuses an empty title and says why', async () => {
    type(fixture, 'trip-form-start-date', '2027-03-01');
    click(fixture, 'trip-form-save');
    await fixture.whenStable();

    expect(saved).toEqual([]);
    expect(error()).toBe('trip-title-required');
  });

  it('refuses an end date before the start date and says why', async () => {
    type(fixture, 'trip-form-title', 'Japan');
    type(fixture, 'trip-form-start-date', '2027-03-10');
    type(fixture, 'trip-form-end-date', '2027-03-01');
    click(fixture, 'trip-form-save');
    await fixture.whenStable();

    expect(saved).toEqual([]);
    expect(error()).toBe('trip-end-before-start');
  });

  it('opens on the trip it edits, and can clear the end date', async () => {
    fixture.componentRef.setInput('trip', trip);
    await fixture.whenStable();

    type(fixture, 'trip-form-end-date', '');
    click(fixture, 'trip-form-save');
    await fixture.whenStable();

    expect(saved).toEqual([
      { title: 'Southeast Asia', startDate: '2026-12-01' },
    ]);
  });

  it('cancels without saving', async () => {
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));

    click(fixture, 'trip-form-cancel');

    expect(cancelled).toBe(true);
    expect(saved).toEqual([]);
  });
});
