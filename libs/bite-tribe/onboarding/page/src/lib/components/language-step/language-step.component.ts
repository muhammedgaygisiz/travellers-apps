import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

export interface OnboardingLanguageOption {
  readonly code: string;
  /** Transloco key for the language name, e.g. `english`. */
  readonly labelKey: string;
}

/**
 * Languages the app ships translations for. Kept in sync with the Transloco
 * `availableLangs` in the shell config and the locale files under
 * `assets/i18n`; a code listed here without a locale file would fall back to
 * English at runtime.
 */
export const ONBOARDING_LANGUAGES: readonly OnboardingLanguageOption[] = [
  { code: 'en', labelKey: 'english' },
  { code: 'am', labelKey: 'amharic' },
  { code: 'ar', labelKey: 'arabic' },
  { code: 'de', labelKey: 'german' },
  { code: 'es', labelKey: 'spanish' },
  { code: 'fr', labelKey: 'french' },
  { code: 'id', labelKey: 'indonesian' },
  { code: 'it', labelKey: 'italian' },
  { code: 'pt', labelKey: 'portuguese' },
  { code: 'th', labelKey: 'thai' },
  { code: 'tr', labelKey: 'turkish' },
];

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
