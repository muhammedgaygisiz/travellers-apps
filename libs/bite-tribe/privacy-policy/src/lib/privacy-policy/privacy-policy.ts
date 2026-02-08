import { Component, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'lib-privacy-policy',
  imports: [PageComponent, IonContent, IonButton],
  templateUrl: 'privacy-policy.html',
  styleUrl: 'privacy-policy.scss',
})
export class PrivacyPolicy {
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
