import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { SHIPPED_LANGUAGES, type ShippedLanguage } from 'utils';

export type OnboardingLanguageOption = ShippedLanguage;

/** The languages the picker offers: every one the app ships. */
export const ONBOARDING_LANGUAGES: readonly OnboardingLanguageOption[] =
  SHIPPED_LANGUAGES;

/**
 * Language onboarding step. Prefilled from the device locale; picking a
 * language applies it immediately so the rest of the assistant is already
 * translated when the user moves on.
 */
@Component({
  selector: 'onboarding-language-step',
  templateUrl: './language-step.component.html',
  styleUrl: './language-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSelect, IonSelectOption, TranslocoPipe],
})
export class LanguageStepComponent {
  language = input<string>('en');

  languageChange = output<string>();

  protected readonly languages = ONBOARDING_LANGUAGES;

  selectLanguage(event: Event): void {
    const value = (event as CustomEvent<{ value?: string }>).detail?.value;

    if (value) {
      this.languageChange.emit(value);
    }
  }
}
