import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import {
  DietaryChoicesComponent,
  type DietaryChoicesChange,
} from '../dietary-choices.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

/** See GitHub issue #2196. */
describe(DietaryChoicesComponent.name, () => {
  let fixture: ComponentFixture<DietaryChoicesComponent>;
  let component: DietaryChoicesComponent;
  let compRef: ComponentRef<DietaryChoicesComponent>;
  let changes: DietaryChoicesChange[];

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(DietaryChoicesComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    changes = [];
    component.choicesChange.subscribe((change) => changes.push(change));
    fixture.detectChanges();
  });

  it('offers lifestyle choices and religion and health choices apart', () => {
    expect(query('settings-dietary-choice-vegan')).not.toBeNull();
    expect(
      query('settings-dietary-lifestyle')?.querySelector(
        '[data-testid="settings-dietary-choice-halal"]',
      ),
    ).toBeNull();
    expect(
      query('settings-dietary-sensitive')?.querySelector(
        '[data-testid="settings-dietary-choice-avoids-pork"]',
      ),
    ).not.toBeNull();
    expect(query('settings-dietary-explanation')).not.toBeNull();
  });

  it('stores a lifestyle choice at once, without asking for consent', () => {
    component.toggle('vegan');

    expect(changes).toEqual([{ choices: ['vegan'], consent: false }]);
    expect(component.pendingChoice()).toBeUndefined();
  });

  it('asks for consent before the first religion or health choice, and stores nothing yet', () => {
    component.toggle('halal');
    fixture.detectChanges();

    expect(changes).toEqual([]);
    expect(component.pendingChoice()).toBe('halal');
    expect(query('settings-dietary-consent')).not.toBeNull();
    expect(component.consentButtons().map(({ role }) => role)).toEqual([
      'cancel',
      'agree',
    ]);
  });

  it('translates the dialog buttons when a dialog opens, not when built', () => {
    MockTranslocoService.translate.mockClear();

    component.toggle('kosher');

    expect(MockTranslocoService.translate).toHaveBeenCalledWith('cancel');
    expect(MockTranslocoService.translate).toHaveBeenCalledWith(
      'dietary-choices-consent-accept',
    );
  });

  it('stores the choice with the consent once the member agrees', () => {
    compRef.setInput('choices', ['vegan']);
    component.toggle('halal');

    component.onConsentDismiss({ detail: { role: 'agree' } });

    expect(changes).toEqual([{ choices: ['vegan', 'halal'], consent: true }]);
    expect(component.pendingChoice()).toBeUndefined();
  });

  it.each(['cancel', 'backdrop', undefined])(
    'stores nothing when the consent is dismissed with %p',
    (role) => {
      component.toggle('gluten-free');

      component.onConsentDismiss({ detail: { role } });

      expect(changes).toEqual([]);
      expect(component.pendingChoice()).toBeUndefined();
    },
  );

  it('does not ask again once consent is given', () => {
    compRef.setInput('choices', ['halal']);
    compRef.setInput('consentGiven', true);

    component.toggle('avoids-alcohol');

    expect(changes).toEqual([
      { choices: ['halal', 'avoids-alcohol'], consent: true },
    ]);
  });

  it('clears a choice by tapping it again', () => {
    compRef.setInput('choices', ['vegan', 'halal']);
    compRef.setInput('consentGiven', true);

    component.toggle('halal');

    expect(changes).toEqual([{ choices: ['vegan'], consent: true }]);
  });

  it('removes every religion and health choice when consent is withdrawn', () => {
    compRef.setInput('choices', ['vegan', 'halal', 'avoids-pork']);
    compRef.setInput('consentGiven', true);
    fixture.detectChanges();

    (
      query('settings-dietary-withdraw-consent') as HTMLElement & {
        click(): void;
      }
    ).click();
    fixture.detectChanges();
    expect(query('settings-dietary-withdraw')).not.toBeNull();
    expect(component.withdrawButtons().map(({ text }) => text)).toEqual([
      'cancel',
      'dietary-choices-withdraw-confirm',
    ]);

    component.onWithdrawDismiss({ detail: { role: 'withdraw' } });

    expect(changes).toEqual([{ choices: ['vegan'], consent: false }]);
  });

  it('keeps everything when the withdrawal is cancelled', () => {
    compRef.setInput('choices', ['halal']);
    compRef.setInput('consentGiven', true);
    component.withdrawConsent();

    component.onWithdrawDismiss({ detail: { role: 'cancel' } });

    expect(changes).toEqual([]);
    expect(component.confirmingWithdrawal()).toBe(false);
  });

  it('offers to withdraw only a consent that was given', () => {
    expect(query('settings-dietary-withdraw-consent')).toBeNull();
    expect(query('settings-dietary-consent-needed')).not.toBeNull();

    compRef.setInput('consentGiven', true);
    fixture.detectChanges();

    expect(query('settings-dietary-withdraw-consent')).not.toBeNull();
    expect(query('settings-dietary-consent-given')).not.toBeNull();
  });

  it('clears every choice and keeps the consent', () => {
    expect(query('settings-dietary-clear')).toBeNull();

    compRef.setInput('choices', ['vegan', 'kosher']);
    compRef.setInput('consentGiven', true);
    fixture.detectChanges();
    expect(query('settings-dietary-clear')).not.toBeNull();

    component.clear();

    expect(changes).toEqual([{ choices: [], consent: true }]);
  });

  it('names a label as a dish does, and an avoidance by its own key', () => {
    expect(component.labelKey('gluten-free')).toBe('dietary-label-gluten-free');
    expect(component.labelKey('avoids-pork')).toBe(
      'dietary-choice-avoids-pork',
    );
  });
});
