import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { appRelease } from 'utils';
import { StoreLinksComponent } from 'bite-tribe/store-links';
import { GlobeComponent } from 'bite-tribe-common/map/globe';

@Component({
  selector: 'about-page',
  styleUrl: 'about.page.scss',
  templateUrl: 'about.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonText,
    IonItem,
    IonLabel,
    IonIcon,
    TranslocoPipe,
    StoreLinksComponent,
    GlobeComponent,
  ],
})
export class AboutPage {
  protected readonly release = appRelease;

  totalNumberBites = input<number>();
  totalNumberUsers = input<number>();

  /**
   * The countries with at least one Bite on BiteTribe (GitHub issue #1893).
   * No globe while they load, if the read fails, or if there are none.
   */
  biteCountryCodes = input<string[]>();

  /** Spin the globe until the first touch. Off in stories, for a still image. */
  autoSpin = input(true, { transform: booleanAttribute });

  protected readonly hasGlobe = computed(
    () => (this.biteCountryCodes()?.length ?? 0) > 0,
  );

  openPrivacyPolicy = output<void>();
}
