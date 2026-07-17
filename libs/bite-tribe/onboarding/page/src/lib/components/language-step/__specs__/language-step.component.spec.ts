import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import {
  LanguageStepComponent,
  ONBOARDING_LANGUAGES,
} from '../language-step.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(LanguageStepComponent.name, () => {
  let fixture: ComponentFixture<LanguageStepComponent>;
  let component: LanguageStepComponent;

  const select = (): HTMLElement =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      '[data-testid="onboarding-language-select"]',
    ) as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LanguageStepComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageStepComponent);
    component = fixture.componentInstance;
  });

  it('offers every language the app ships translations for', () => {
    fixture.detectChanges();

    expect(
      (fixture.debugElement.nativeElement as HTMLElement).querySelectorAll(
        'ion-select-option',
      ),
    ).toHaveLength(ONBOARDING_LANGUAGES.length);
  });

  it('prefills the select with the given language', () => {
    fixture.componentRef.setInput('language', 'de');

    fixture.detectChanges();

    expect((select() as HTMLIonSelectElement).value).toBe('de');
  });

  it('emits the picked language', () => {
    fixture.detectChanges();
    const languageChange = jest.spyOn(component.languageChange, 'emit');

    select().dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'tr' } }),
    );

    expect(languageChange).toHaveBeenCalledWith('tr');
  });

  it('ignores a change event without a value', () => {
    fixture.detectChanges();
    const languageChange = jest.spyOn(component.languageChange, 'emit');

    select().dispatchEvent(new CustomEvent('ionChange', { detail: {} }));

    expect(languageChange).not.toHaveBeenCalled();
  });
});
