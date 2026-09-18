import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { StoreLinksComponent } from 'bite-tribe/store-links';

@Component({
  selector: 'start',
  templateUrl: 'start.component.html',
  styleUrl: 'start.component.scss',
  imports: [
    IonContent,
    IonButton,
    RouterLink,
    TranslocoPipe,
    StoreLinksComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {
  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Start',
    });
  }
}
