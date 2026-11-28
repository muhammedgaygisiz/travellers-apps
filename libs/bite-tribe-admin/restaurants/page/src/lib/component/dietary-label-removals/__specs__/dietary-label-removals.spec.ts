import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, APP_TITLE } from 'utils';
import { DietaryLabelRemovals } from '../dietary-label-removals';
import { REQUESTED_REMOVAL, UNREQUESTED_REMOVAL } from './fixtures';

addNecessaryIcons();

/** The operator's queue of removed dietary labels (GitHub issue #2199). */
describe(DietaryLabelRemovals.name, () => {
  let fixture: ComponentFixture<DietaryLabelRemovals>;
  let component: DietaryLabelRemovals;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
        {
          provide: TranslocoService,
          useValue: {
            translate: jest.fn((key: string) => key),
            config: { reRenderOnLangChange: jest.fn() },
            langChanges$: of(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DietaryLabelRemovals);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('removals', [
      REQUESTED_REMOVAL,
      UNREQUESTED_REMOVAL,
    ]);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const card = (removalId: string): HTMLElement =>
    el().querySelector(
      `[data-testid="dietary-removal-${removalId}"]`,
    ) as HTMLElement;

  it('shows the request with its explanation, and the dispute notes', () => {
    const requested = card(REQUESTED_REMOVAL.removalId);

    expect(
      requested.querySelector('[data-testid="dietary-removal-request"]')
        ?.textContent,
    ).toContain('vegan fish sauce');
    expect(
      requested.querySelectorAll('[data-testid="dietary-removal-note"]'),
    ).toHaveLength(1);
    expect(
      card(UNREQUESTED_REMOVAL.removalId).querySelector(
        '[data-testid="dietary-removal-request"]',
      ),
    ).toBeNull();
  });

  it('shows the evidence photo once it passed the check', () => {
    fixture.componentRef.setInput('removals', [
      {
        ...REQUESTED_REMOVAL,
        imagePath: 'https://evidence',
        imageStatus: 'uploaded',
      },
    ]);
    fixture.detectChanges();

    expect(
      el()
        .querySelector('[data-testid="dietary-removal-evidence"]')
        ?.getAttribute('src'),
    ).toBe('https://evidence');
  });

  it('counts the reasons diners gave, most given first', () => {
    expect(component.reasonCounts(REQUESTED_REMOVAL)).toEqual([
      ['animal-product', 2],
      ['staff-said-not', 1],
    ]);
    expect(
      component.reasonCounts({
        ...REQUESTED_REMOVAL,
        reasons: undefined,
      } as never),
    ).toEqual([]);
  });

  it('decides only with a reason, and restores without a request', () => {
    const answers: unknown[] = [];
    component.answer.subscribe((request) => answers.push(request));

    component.decide(UNREQUESTED_REMOVAL.removalId, 'restore');
    expect(answers).toEqual([]);
    expect(component.canDecide(UNREQUESTED_REMOVAL.removalId)).toBe(false);

    component.setReason(UNREQUESTED_REMOVAL.removalId, '  Brigading  ');
    component.decide(UNREQUESTED_REMOVAL.removalId, 'restore');
    component.setReason(REQUESTED_REMOVAL.removalId, 'Still has fish sauce');
    component.decide(REQUESTED_REMOVAL.removalId, 'confirm');

    expect(answers).toEqual([
      {
        removalId: UNREQUESTED_REMOVAL.removalId,
        decision: 'restore',
        reason: 'Brigading',
      },
      {
        removalId: REQUESTED_REMOVAL.removalId,
        decision: 'confirm',
        reason: 'Still has fish sauce',
      },
    ]);
  });

  it('decides nothing more while one decision is under way', () => {
    const answers: unknown[] = [];
    component.answer.subscribe((request) => answers.push(request));
    component.setReason(REQUESTED_REMOVAL.removalId, 'Brigading');
    fixture.componentRef.setInput('answering', UNREQUESTED_REMOVAL.removalId);
    fixture.detectChanges();

    component.decide(REQUESTED_REMOVAL.removalId, 'restore');

    expect(answers).toEqual([]);
  });

  it('says when nothing is waiting, and when the queue failed to load', () => {
    fixture.componentRef.setInput('removals', []);
    fixture.detectChanges();
    expect(
      el().querySelector('[data-testid="dietary-removals-empty"]'),
    ).toBeTruthy();

    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();
    expect(
      el().querySelector('[data-testid="dietary-removals-failed"]'),
    ).toBeTruthy();
  });
});
