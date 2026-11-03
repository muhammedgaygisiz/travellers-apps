import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AnalyticsEvent,
  AnalyticsService,
  StoreLinkSurface,
  StoreListing,
} from 'ta-firestore';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from './store-links';

/**
 * A route to the two store listings, on the web app and only there.
 *
 * The web app is the surface a link in a message or a search result lands on,
 * and until this it was a dead end for anyone who would rather use the phone
 * app - the repository held no store link at all. Inside a native wrapper the
 * same block is noise: it offers the user the store they installed from. See
 * GitHub issue #1453.
 *
 * Which control it draws is a CSS decision rather than a TypeScript one, and
 * deliberately so - see the stylesheet. On a desktop browser each listing is a
 * QR code, because a plain store link there opens a listing on the wrong
 * device; below {@link STORE_BADGE_MAX_WIDTH_PX} each is the store's own badge,
 * because a code cannot be scanned by the screen displaying it.
 *
 * A followed link logs `store_link_clicked` with the page it was on (GitHub
 * issue #1759), so the activation funnel can tell a web visitor the web handed
 * to a store from one it lost. A scanned code is not a click on this page and
 * is not counted: the phone that scans it opens the store directly.
 */
@Component({
  selector: 'bt-store-links',
  templateUrl: 'store-links.component.html',
  styleUrl: 'store-links.component.scss',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreLinksComponent {
  /**
   * Read once at construction rather than as a signal, because a Capacitor
   * platform cannot change under a running app - a build is native or it is
   * not. The `@if` around the whole block means a native build renders nothing
   * here, badges and codes alike.
   */
  protected readonly isWeb = !Capacitor.isNativePlatform();

  /** The page this block is on, reported with every followed link. */
  readonly surface = input.required<StoreLinkSurface>();

  protected readonly appStoreUrl = APP_STORE_URL;
  protected readonly googlePlayUrl = GOOGLE_PLAY_URL;

  private readonly analytics = inject(AnalyticsService);

  protected followed(store: StoreListing): void {
    this.analytics.logEvent(AnalyticsEvent.StoreLinkClicked, {
      store,
      surface: this.surface(),
    });
  }
}
