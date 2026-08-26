import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  AlertController,
  IonContent,
  IonImg,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import type { Bite, Menu, MenuItem, Restaurant } from 'model';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { MenuComponent } from '../menu/menu.component';

@Component({
  selector: 'menu-page',
  templateUrl: 'menu-page.component.html',
  styleUrl: 'menu-page.component.scss',
  imports: [PageComponent, IonContent, IonImg, IonSkeletonText, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  bite = input<Bite>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();

  /**
   * The menu has not arrived yet. The page answers with skeletons rather than
   * with its final layout, because a menu that is still loading used to be
   * indistinguishable from a restaurant that genuinely has none. See GitHub
   * issue #1382.
   */
  isMenuLoading = input(false, { transform: booleanAttribute });

  /**
   * The menu could not be resolved at all. Distinct from a loaded menu with no
   * items, which keeps the empty state it has always had (#1382).
   */
  isMenuUnavailable = input(false, { transform: booleanAttribute });

  createBiteClick = output<MenuItem>();
  readonly goBack = output();
  readonly retryLoad = output();

  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });

  /**
   * The restaurant photo, if there is one. Read here so the header can be left
   * out entirely when there is nothing to show: bound unconditionally it
   * reserved space for an image with no source, which read as a broken page
   * rather than as a page without a photo. See GitHub issue #1382.
   */
  imageSrc = computed(() => {
    const restaurant = this.restaurant();

    return restaurant?.imagePath || restaurant?.image;
  });

  /**
   * How many categories, and how many items in each, the skeleton traces. Held
   * as fields rather than written into the template, so the loop does not
   * rebuild its array on every check.
   */
  protected readonly skeletonCategories = [0, 1];
  protected readonly skeletonItems = [0, 1];

  private reportedFailure = false;

  /** A failure that arrived while a report was in flight, and still owes an answer. */
  private pendingReport = false;

  /**
   * The load-failure alert the page currently owns. Ionic mounts overlays on the
   * app root rather than inside the page, so without a reference to take down
   * there is nothing to take down: the alert would survive the route change and
   * sit over whatever the user navigated back to. Mirrors the Bite details page,
   * which learned this the hard way in GitHub issue #1304.
   */
  private loadFailureAlert: HTMLIonAlertElement | undefined;

  /**
   * Covers the gap between creating an alert and presenting it, so presenting
   * stays single-flight. A retry that fails again must not stack a second alert
   * under the one already on screen.
   */
  private presentingLoadFailure = false;

  private isDestroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;

      void this.dismissLoadFailureAlert();
    });

    effect(() => {
      if (!this.isMenuUnavailable()) {
        // A retry puts the read back in flight, so the next failure is reported
        // again rather than leaving the page silent, and the alert about the
        // read that is no longer failing goes away with it.
        this.reportedFailure = false;

        void this.dismissLoadFailureAlert();

        return;
      }

      if (this.reportedFailure) {
        return;
      }

      this.reportedFailure = true;

      void this.reportLoadFailure();
    });
  }

  private async reportLoadFailure(): Promise<void> {
    if (this.loadFailureAlert || this.presentingLoadFailure) {
      // A failure raised while a report is already in flight would be dropped
      // here and never reach the screen. A cold start onto a menu route does
      // exactly that: the read is asked for twice, so the page can give up,
      // recover and give up again inside one report, and the second failure
      // arrived while the first was still being taken down. It is remembered
      // instead and answered below. See GitHub issue #1382.
      this.pendingReport = true;

      return;
    }

    this.presentingLoadFailure = true;

    try {
      await this.presentLoadFailureAlert();
    } finally {
      this.presentingLoadFailure = false;
    }

    if (!this.pendingReport) {
      return;
    }

    this.pendingReport = false;

    // Only a failure that is still current and still unanswered: a report that
    // presented owns the screen, and one the page has recovered from has
    // nothing left to say.
    if (!this.isDestroyed && this.reportedFailure && !this.loadFailureAlert) {
      await this.reportLoadFailure();
    }
  }

  /**
   * Writes the alert and puts it on screen, or drops it if there is no longer a
   * failure to report. Separate from `reportLoadFailure` so that giving up here
   * ends this attempt rather than the report, which still has to answer a
   * failure that arrived while this one was running.
   */
  private async presentLoadFailureAlert(): Promise<void> {
    await this.ensureTranslationsLoaded();

    const alert = await this.createMenuUnavailableAlert();

    // Creating is asynchronous, so the page can be gone, or the read can have
    // moved on, by the time there is an alert to show. Presenting it then
    // would leak exactly the overlay this is meant to prevent.
    if (this.isDestroyed || !this.reportedFailure) {
      await alert.dismiss();

      return;
    }

    this.loadFailureAlert = alert;

    await alert.present();
  }

  /**
   * Waits for the active language before the alert is written.
   *
   * The alert translates synchronously, so a failure reported before the
   * language file has arrived - a cold start straight onto a menu route - would
   * put raw keys on screen, which is the defect issue #1186 fixed elsewhere.
   * Loads are cached per language, so a language already in memory costs
   * nothing.
   */
  private async ensureTranslationsLoaded(): Promise<void> {
    try {
      await firstValueFrom(
        this.transloco.load(this.transloco.getActiveLang?.() || 'en'),
      );
    } catch (error) {
      // A failed load is no reason to withhold the failure: Transloco falls
      // back on its own, and the page must still say what happened.
      console.warn(
        'Failed to load translations for the menu failure alert:',
        error,
      );
    }
  }

  /** Takes the alert down with the page that raised it. */
  private async dismissLoadFailureAlert(): Promise<void> {
    const alert = this.loadFailureAlert;
    this.loadFailureAlert = undefined;

    await alert?.dismiss();
  }

  /**
   * A menu that cannot be resolved leaves nothing to interact with, so the alert
   * refuses backdrop dismissal and always offers the way back. It offers the
   * read again next to it because a failure says nothing about the menu itself -
   * a timeout, an offline device or a rejected read leaves it intact. Modelled
   * on the Bite details page's `biteUnavailable` alert (#1232), so the two pages
   * answer a failed read the same way. See GitHub issue #1382.
   */
  private createMenuUnavailableAlert(): Promise<HTMLIonAlertElement> {
    return this.alertController.create({
      header: this.transloco.translate('menu-could-not-be-loaded'),
      message: this.transloco.translate(
        'this-menu-could-not-be-loaded-right-now',
      ),
      backdropDismiss: false,
      buttons: [
        {
          text: this.transloco.translate('go-back'),
          role: 'cancel',
          handler: (): void => this.goBack.emit(),
        },
        {
          text: this.transloco.translate('try-again'),
          handler: (): void => this.retryLoad.emit(),
        },
      ],
    });
  }
}
