import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Public store-review page for account deletion.
 *
 * It documents the flow and stays reachable without signing in, because both
 * app stores require a publicly accessible deletion URL. The deletion itself
 * happens in the app; the email route below is the fallback for people who can
 * no longer sign in.
 */
@Component({
  selector: 'lib-delete-account',
  imports: [PageComponent, IonContent, IonButton, TranslocoPipe],
  templateUrl: 'delete-account.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: 'delete-account.scss',
})
export class DeleteAccount {
  isContactClicked = signal(false);

  year = String(new Date().getFullYear());

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Account Deletion',
    });
  }

  contactClicked(): void {
    this.isContactClicked.set(true);
  }
}
