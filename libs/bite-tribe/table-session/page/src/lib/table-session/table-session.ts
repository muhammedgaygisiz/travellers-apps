import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import type { TableScanContext } from 'model';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { PATH } from 'utils';
import { RouterLink } from '@angular/router';
import {
  TableSessionService,
  type TableSessionView,
} from 'bite-tribe/table-session-data-access';

/**
 * The screen a scanned table QR code lands on (GitHub issue #1101).
 *
 * ## Public, and it has to be
 *
 * The route carries no auth guard. A guest at a table has no BiteTribe account
 * and may never want one, and the printed code is `bitetribe.app/t/{token}` -
 * so a sign-in wall here would be a wall in front of a restaurant's own menu,
 * put up by a product the guest has never heard of. They are signed in
 * *anonymously* when they confirm, which is an identity for a table rather than
 * a login: `authGuard` does not accept one, so this session cannot carry them
 * into the member surface.
 *
 * ## Every refusal has its own sentence
 *
 * Twelve reasons, each with its own line and one of three next steps. That is
 * the whole point of the reason list being a closed set: a guest told
 * "something went wrong" while sitting at a table puts their phone away, and a
 * guest told "this code was replaced, there should be a newer one on the table"
 * looks at the table.
 *
 * The next step comes from the backend's answer, which reads it off one table
 * in `table-ordering.ts`, so the sentence and the advice cannot come apart.
 *
 * ## Why the states are narrowed here and not in the template
 *
 * `strictTemplates` cannot narrow a discriminated union through a `@switch` on
 * a signal call, and reaching for `$any` to get past that would turn off the
 * checking for every field behind it - on a screen whose whole job is rendering
 * one of six shapes. So each state is a computed that answers `undefined` when
 * it is not the current one, and the template is a chain of `@if ... as`.
 */
@Component({
  selector: 'lib-table-session',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonSpinner,
    TranslocoPipe,
    RouterLink,
  ],
  providers: [TableSessionService],
  templateUrl: 'table-session.html',
  styleUrl: 'table-session.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSession implements OnInit {
  protected readonly service = inject(TableSessionService);

  protected readonly isBusy = this.service.isBusy;

  private readonly state = this.service.state;

  private whenKind<TKind extends TableSessionView['kind']>(
    kind: TKind,
  ): () => Extract<TableSessionView, { kind: TKind }> | undefined {
    return computed(() => {
      const state = this.state();

      return state.kind === kind
        ? (state as Extract<TableSessionView, { kind: TKind }>)
        : undefined;
    });
  }

  protected readonly loading = this.whenKind('loading');
  protected readonly confirmation = this.whenKind('confirm');
  protected readonly menuOnly = this.whenKind('menuOnly');
  protected readonly joined = this.whenKind('joined');
  protected readonly left = this.whenKind('left');
  protected readonly refusal = this.whenKind('refused');
  protected readonly failure = this.whenKind('failed');

  /**
   * The values a sentence interpolates, from the context the state carries.
   *
   * A method over a required context rather than a computed over an optional
   * one. Every state that renders a place - `confirm`, `joined`, `left` -
   * carries its own `context`, and the template narrows to it with `@if ... as`
   * before calling this, so there is nothing to fall back to. The computed it
   * replaced read `service.context()`, which is optional, and therefore carried
   * `?.` and `?? ''` on every field: branches no test could reach, because the
   * only templates that read it are the three that always have one.
   */
  protected placeOf(context: TableScanContext): Record<string, string> {
    return {
      restaurant: context.restaurant.name,
      table: context.table.label,
      // The one field that really can be absent: a table whose room was
      // deleted still resolves, because the guest is still sitting at it. The
      // template drops the line rather than rendering an empty one, and both
      // arms of this are covered.
      room: context.room.name ?? '',
    };
  }

  /**
   * The translation key for the day a closed restaurant reopens.
   *
   * The day is the lower-case English weekday the opening hours are stored
   * with, and `day-monday` through `day-sunday` already exist in every locale
   * file - so it is translated rather than left in English beside a translated
   * sentence.
   */
  protected dayKey(day: string): string {
    return `day-${day}`;
  }

  ngOnInit(): void {
    void this.service.resolve();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Table Session' });
  }

  protected confirm(): void {
    void this.service.confirm();
  }

  protected leave(): void {
    void this.service.leave();
  }

  protected retry(): void {
    void this.service.retry();
  }

  /**
   * Where the menu lives, for a restaurant that does not take orders here.
   *
   * The scan screen links to the public menu rather than rendering one, so a
   * guest who arrived by scanning and a guest who followed a published link
   * read the same screen. Two menu renderers is how two menus start disagreeing
   * about what an unavailable dish looks like.
   */
  protected menuPath(restaurantId: string): string[] {
    return ['/', PATH.PUBLIC_MENU, restaurantId];
  }
}
