import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { StoreLinksComponent } from 'bite-tribe/store-links';
import { STORE_SERVICE } from 'utils';

export type StartPlatform = 'web' | 'ios' | 'android';

export type SignInProvider = 'google' | 'apple';

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
 *
 * Both layouts offer Google and Apple sign-in directly (issue #1714), through
 * the same store calls as the login page. One tap signs in an existing account
 * or creates a new one, so the buttons need no log-in and sign-up variants.
 */
@Component({
  selector: 'start',
  templateUrl: 'start.component.html',
  styleUrl: 'start.component.scss',
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonText,
    NgTemplateOutlet,
    RouterLink,
    TranslocoPipe,
    StoreLinksComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {
  private readonly store = inject(STORE_SERVICE, { optional: true });

  /**
   * The platform the page renders for. Read from Capacitor, and an input only
   * so a story can render the native layouts, which a browser never reaches on
   * its own.
   */
  readonly platform = input<StartPlatform>(
    Capacitor.getPlatform() as StartPlatform,
  );

  protected readonly native = computed(() => this.platform() !== 'web');

  /**
   * Apple first where Apple is the platform, Google first everywhere else.
   * The one a visitor is most likely signed in to on that device leads.
   */
  protected readonly providers = computed<SignInProvider[]>(() =>
    this.platform() === 'ios' ? ['apple', 'google'] : ['google', 'apple'],
  );

  protected readonly pending = computed(
    () => this.store?.loginPending() ?? false,
  );

  /**
   * Whether this page started the sign-in that failed. `loginFailed` is
   * global auth state, and a rejection earlier on `/login` must not show up
   * here as if the visitor had just tapped a button. A cancelled sign-in does
   * not raise the flag, so it shows nothing (issue #1622).
   */
  private readonly attempted = signal(false);
  protected readonly signInFailed = computed(
    () => this.attempted() && (this.store?.loginFailed() ?? false),
  );

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Start',
    });
  }

  protected signInWith(provider: SignInProvider): void {
    // The disabled buttons already block this, but a queued tap can still land
    // between the click and the pending flag turning on.
    if (this.pending()) {
      return;
    }

    this.attempted.set(true);
    if (provider === 'google') {
      this.store?.loginWithGoogleAccount();
    } else {
      this.store?.loginWithAppleAccount();
    }
  }
}
