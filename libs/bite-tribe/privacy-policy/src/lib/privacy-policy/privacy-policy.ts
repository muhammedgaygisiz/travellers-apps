import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco';
import { resolvePrivacyPolicyLanguage } from './privacy-policy-language';

/**
 * The Privacy Policy document.
 *
 * The policy follows the selected app language instead of the English original
 * (issue #1218). It is published in every language the app offers; a language
 * without published policy copy falls back to English and says so on the page
 * rather than switching the language of legal content without telling the user.
 */
@Component({
  selector: 'lib-privacy-policy',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    TranslocoDirective,
    TranslocoPipe,
  ],
  templateUrl: 'privacy-policy.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: 'privacy-policy.scss',
})
export class PrivacyPolicy {
  private readonly transloco = inject(TranslocoService);

  private readonly appLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  private readonly policyLanguage = computed(() =>
    resolvePrivacyPolicyLanguage(this.appLang()),
  );

  /**
   * The policy language in Transloco's static form.
   *
   * Static means the rendered document keeps the language it resolved to. A
   * dynamic lang would follow a later app-language switch and then render raw
   * keys for a language that has no policy.
   */
  policyLang = computed(() => `${this.policyLanguage().lang}|static`);

  /** True when the app language has no published policy and English is shown. */
  isLanguageFallback = computed(() => this.policyLanguage().isFallback);

  isContactClicked = signal(false);

  year = String(new Date().getFullYear());

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Privacy Policy',
    });
  }

  contactClicked(): void {
    this.isContactClicked.set(true);
  }
}
