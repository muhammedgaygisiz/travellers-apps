import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'bt-start',
  templateUrl: './bite-tribe-start.component.html',
  styleUrl: './bite-tribe-start.component.scss',
  imports: [IonContent, IonButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeStartComponent {
  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Start',
    });
  }
}
