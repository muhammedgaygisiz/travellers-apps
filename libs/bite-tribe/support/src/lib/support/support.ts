import { Component, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { PATH } from 'utils';

/**
 * Public support page.
 *
 * It exists because the App Store requires a Support URL, which is a page
 * rather than an address: Apple publishes the link on the product page and a
 * `mailto:` is not accepted there. It stays reachable without signing in, for
 * the same reason the account-deletion page does — someone who cannot sign in
 * is exactly the person who needs it.
 *
 * The contact address sits behind a reveal control, matching the privacy
 * policy and account-deletion pages, so it is not scraped from the page source.
 */
@Component({
  selector: 'lib-support',
  imports: [PageComponent, IonContent, IonButton, TranslocoPipe, RouterLink],
  templateUrl: 'support.html',
  styleUrl: 'support.scss',
})
export class Support {
  isContactClicked = signal(false);

  year = String(new Date().getFullYear());

  readonly privacyPolicyPath = `/${PATH.PRIVACY_POLICY}`;

  readonly accountDeletionPath = `/${PATH.ACCOUNT_DELETION}`;

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Support',
    });
  }

  contactClicked(): void {
    this.isContactClicked.set(true);
  }
}
