import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The signed-out landing page of the admin app.
 *
 * It exists because `authGuard` sends an unauthenticated visitor to
 * `PATH.START`, so the route has to resolve to something. It mirrors the
 * business app's start page — same logo, same grid, same button — because an
 * operator should recognise it as BiteTribe rather than as a bare form.
 *
 * The one deliberate difference is that it offers no Sign Up. Operator access
 * is granted through the admin app, never self-served, so an account created
 * here would be turned away by `roleGuard` the moment it signed in. The shared
 * login page still shows a Sign Up button, which is why the hint on this page
 * says access is granted rather than requested (issue #1469).
 */
@Component({
  selector: 'lib-admin-start',
  templateUrl: './admin-start.html',
  styleUrl: './admin-start.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, RouterLink, TranslocoPipe],
})
export class AdminStart {
  /**
   * `AUTH_ROUTES` registers the login under this literal path, and
   * `AuthService.logout()` navigates to the same literal. There is no `PATH`
   * entry for it to read, so adding one here would create a second spelling of
   * a route neither of those two would use.
   */
  readonly loginPath = '/login';
}
