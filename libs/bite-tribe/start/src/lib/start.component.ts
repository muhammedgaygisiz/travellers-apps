import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'start',
  templateUrl: 'start.component.html',
  styleUrl: 'start.component.scss',
  imports: [IonContent, IonButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {
  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Start',
    });
  }
}
