import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { DietaryLabelApprovalEntry } from 'model';
import { addNecessaryIcons, APP_TITLE } from 'utils';
import { DietaryLabelApprovals } from '../dietary-label-approvals';

addNecessaryIcons();

const QUEUE: DietaryLabelApprovalEntry[] = [
  {
    restaurantId: 'r1',
    restaurantName: 'Thai Garden',
    requestedAt: '2026-11-26T09:00:00.000Z',
    items: [
      {
        menuItemId: 'm1',
        name: 'Pad Thai',
        labels: ['vegan'],
        options: ['gluten-free'],
      },
    ],
  },
];

/** The operator's queue of dietary labels (GitHub issue #2198). */
describe(DietaryLabelApprovals.name, () => {
  let fixture: ComponentFixture<DietaryLabelApprovals>;
  let component: DietaryLabelApprovals;

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

    fixture = TestBed.createComponent(DietaryLabelApprovals);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('approvals', QUEUE);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('lists each waiting label and option of each dish', () => {
    expect(
      el().querySelector('[data-testid="dietary-approvals-r1"]'),
    ).toBeTruthy();
    expect(
      el().querySelector('[data-testid="dietary-approval-m1-label-vegan"]'),
    ).toBeTruthy();
    expect(
      el().querySelector(
        '[data-testid="dietary-approval-m1-option-gluten-free"]',
      ),
    ).toBeTruthy();
  });

  it('emits an approval and a refusal for one label', () => {
    const answers: unknown[] = [];
    component.answer.subscribe((request) => answers.push(request));

    el()
      .querySelector<HTMLElement>(
        '[data-testid="dietary-approval-m1-label-vegan"] [data-testid="dietary-approval-approve"]',
      )
      ?.click();
    el()
      .querySelector<HTMLElement>(
        '[data-testid="dietary-approval-m1-option-gluten-free"] [data-testid="dietary-approval-refuse"]',
      )
      ?.click();

    expect(answers).toEqual([
      {
        restaurantId: 'r1',
        menuItemId: 'm1',
        label: 'vegan',
        kind: 'label',
        approve: true,
      },
      {
        restaurantId: 'r1',
        menuItemId: 'm1',
        label: 'gluten-free',
        kind: 'option',
        approve: false,
      },
    ]);
  });

  it('answers nothing more while one answer is under way', () => {
    const answers: unknown[] = [];
    component.answer.subscribe((request) => answers.push(request));
    fixture.componentRef.setInput('answering', 'r1/m1/label/vegan');
    fixture.detectChanges();

    component.respond(
      'r1',
      { menuItemId: 'm1', label: 'gluten-free', kind: 'option' },
      true,
    );

    expect(answers).toEqual([]);
    expect(
      el().querySelector(
        '[data-testid="dietary-approval-m1-label-vegan"] ion-spinner',
      ),
    ).toBeTruthy();
  });

  it('says when nothing is waiting, and when the queue failed to load', () => {
    fixture.componentRef.setInput('approvals', []);
    fixture.detectChanges();
    expect(
      el().querySelector('[data-testid="dietary-approvals-empty"]'),
    ).toBeTruthy();

    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();
    expect(
      el().querySelector('[data-testid="dietary-approvals-failed"]'),
    ).toBeTruthy();
  });
});
