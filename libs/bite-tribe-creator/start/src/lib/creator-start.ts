import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The signed-out landing page of the Bite Creator app (issue #2130).
 *
 * It exists because `authGuard` sends an unauthenticated visitor to
 * `PATH.START`. It mirrors the business and admin start pages - same logo,
 * same grid - and, unlike the admin one, offers Sign Up: any BiteTribe account
 * may create a BiteTrail, so an account is self-served here as it is in the
 * consumer app.
 */
@Component({
  selector: 'lib-creator-start',
  templateUrl: './creator-start.html',
  styleUrl: './creator-start.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, RouterLink, TranslocoPipe],
})
export class CreatorStart {
  /** The literal paths `AUTH_ROUTES` registers; there is no `PATH` entry. */
  readonly loginPath = '/login';
  readonly registrationPath = '/registration';
}
