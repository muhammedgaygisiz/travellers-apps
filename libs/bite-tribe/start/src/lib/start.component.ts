import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { StoreLinksComponent } from 'bite-tribe/store-links';

/**
 * The page a signed-out visitor lands on.
 *
 * Two layouts, split by platform rather than by width. The native apps keep
 * the logo and two buttons: someone who installed the app already decided to
 * try it. The web start page is where a link from Instagram or LinkedIn lands,
 * and in the fortnight to 2026-09-26 none of about 44 real web visitors started
 * onboarding from the old layout (issue #1706). So on the web, at every width,
 * the page says what BiteTribe is, makes signing up the primary action, and
 * shows the app next to the store links.
 */
@Component({
  selector: 'start',
  templateUrl: 'start.component.html',
  styleUrl: 'start.component.scss',
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    RouterLink,
    TranslocoPipe,
    StoreLinksComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {
  /**
   * Whether this is a native build. Read from Capacitor, and an input only so
   * a story can render the native layout, which a browser never reaches on
   * its own.
   */
  readonly native = input(Capacitor.isNativePlatform());

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Start',
    });
  }
}
