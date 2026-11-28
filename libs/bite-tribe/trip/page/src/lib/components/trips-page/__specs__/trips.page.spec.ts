import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Trip } from 'model';
import { TripsPage } from '../trips.page';

addNecessaryIcons();

const trips: Trip[] = [
  {
    id: 'now',
    userId: 'owner',
    title: 'Southeast Asia',
    startDate: '2026-11-01',
  },
  {
    id: 'past',
    userId: 'owner',
    title: 'Peru',
    startDate: '2025-05-01',
    endDate: '2025-05-20',
  },
];

describe(TripsPage.name, () => {
  let fixture: ComponentFixture<TripsPage>;
  let page: TripsPage;

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
        { provide: APP_TITLE, useValue: 'BiteTribe' },
      ],
    });
    fixture = TestBed.createComponent(TripsPage);
    page = fixture.componentInstance;
    fixture.componentRef.setInput('today', '2026-11-28');
  });

  const all = (testId: string): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`),
    );

  it('lists the trips in the order given, with their dates', async () => {
    fixture.componentRef.setInput('trips', trips);
    await fixture.whenStable();

    expect(all('trip-item').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Southeast Asia'),
      expect.stringContaining('Peru'),
    ]);
    expect(all('trip-dates').map((d) => d.textContent?.trim())).toEqual([
      'trip-since',
      'May 1\u2009–\u200920, 2025',
    ]);
  });

  it('marks only the trip under way as ongoing', async () => {
    fixture.componentRef.setInput('trips', trips);
    await fixture.whenStable();

    expect(all('trip-ongoing')).toHaveLength(1);
    expect(
      all('trip-item')[0].querySelector('[data-testid="trip-ongoing"]'),
    ).not.toBeNull();
  });

  it('shows the empty state only once the trips are read', async () => {
    fixture.componentRef.setInput('loaded', false);
    await fixture.whenStable();
    expect(all('empty-trips-message')).toHaveLength(0);

    fixture.componentRef.setInput('loaded', true);
    await fixture.whenStable();
    expect(all('empty-trips-message')).toHaveLength(1);
  });

  it('creates a trip from the form', () => {
    const created: unknown[] = [];
    page.createTrip.subscribe((draft) => created.push(draft));

    page.openCreate();
    page['onSave']({ title: 'Japan', startDate: '2027-03-01' });

    expect(created).toEqual([{ title: 'Japan', startDate: '2027-03-01' }]);
    expect(page['formTarget']()).toBeNull();
  });

  it('updates the trip the form was opened on', () => {
    const updated: unknown[] = [];
    page.updateTrip.subscribe((change) => updated.push(change));

    page['openEdit'](trips[1], new Event('click'));
    page['onSave']({ title: 'Peru', startDate: '2025-05-02' });

    expect(updated).toEqual([
      { trip: trips[1], draft: { title: 'Peru', startDate: '2025-05-02' } },
    ]);
  });

  it('deletes only after the confirmation is accepted', () => {
    const deleted: string[] = [];
    page.deleteTrip.subscribe((id) => deleted.push(id));

    page['openDeleteConfirmation']('past', new Event('click'));
    page['onDeleteDismiss'](
      new CustomEvent('didDismiss', { detail: { role: 'cancel' } }),
    );
    page['openDeleteConfirmation']('past', new Event('click'));
    page['onDeleteDismiss'](
      new CustomEvent('didDismiss', { detail: { role: 'delete' } }),
    );

    expect(deleted).toEqual(['past']);
  });
});
