import { Component, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'lib-delete-account',
  imports: [PageComponent, IonContent, IonButton],
  templateUrl: 'delete-account.html',
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
