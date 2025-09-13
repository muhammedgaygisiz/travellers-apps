import { Component } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'lib-bite-tribe-start',
  templateUrl: './bite-tribe-start.component.html',
  styleUrl: './bite-tribe-start.component.scss',
  imports: [IonContent, IonButton, RouterLink],
})
export class BiteTribeStartComponent {
  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Start',
    });
  }
}
