import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { StoreLinksComponent } from 'bite-tribe/store-links';
import {
  PublicMenuService,
  type PublicMenuView,
} from 'bite-tribe/menu-data-access';
import { MenuComponent } from '../components/menu/menu.component';

/**
 * A restaurant's menu, read with no download and no sign-up
 * (GitHub issue #1102, delivering issues #370 and #371).
 *
 * ## Public, and it renders less than the page next door
 *
 * Two things are deliberately absent. There is no "create a Bite" button,
 * because the reader may have no BiteTribe account at all and that button opens
 * a sign-up for a product they came here to read a menu of. And there is no
 * page chrome - no menu, no footer, no back button - because they did not
 * arrive from anywhere inside the app.
 *
 * The renderer itself is the same `bt-menu` the authenticated page uses. Two
 * menu renderers is how two menus start disagreeing about what an unavailable
 * dish looks like.
 */
@Component({
  selector: 'lib-public-menu',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonSpinner,
    TranslocoPipe,
    MenuComponent,
    StoreLinksComponent,
  ],
  providers: [PublicMenuService],
  templateUrl: 'public-menu.component.html',
  styleUrl: 'public-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicMenu implements OnInit {
  protected readonly service = inject(PublicMenuService);

  private readonly state = this.service.state;

  private whenKind<TKind extends PublicMenuView['kind']>(
    kind: TKind,
  ): () => Extract<PublicMenuView, { kind: TKind }> | undefined {
    return computed(() => {
      const state = this.state();

      return state.kind === kind
        ? (state as Extract<PublicMenuView, { kind: TKind }>)
        : undefined;
    });
  }

  protected readonly loading = this.whenKind('loading');
  protected readonly loaded = this.whenKind('menu');
  protected readonly refusal = this.whenKind('refused');
  protected readonly failure = this.whenKind('failed');

  ngOnInit(): void {
    void this.service.load();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Public Menu' });
  }

  protected retry(): void {
    void this.service.retry();
  }
}
