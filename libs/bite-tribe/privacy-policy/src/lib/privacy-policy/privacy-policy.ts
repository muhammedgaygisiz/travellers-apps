import { Component, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'lib-privacy-policy',
  imports: [PageComponent, IonContent, IonButton],
  templateUrl: 'privacy-policy.html',
  styleUrl: 'privacy-policy.scss',
})
export class PrivacyPolicy {
  isContactClicked = signal(false);

  year = String(new Date().getFullYear());

  contactClicked(): void {
    this.isContactClicked.set(true);
  }
}
