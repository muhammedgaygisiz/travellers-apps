import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageComponent } from 'common/ui/page';
import {
  countContinents,
  GlobeComponent,
  type GlobeCountryTap,
  type GlobeZoomControl,
  normalizeCountryCodes,
} from 'bite-tribe-common/map/globe';

const countryName = (countryCode: string, language: string): string => {
  try {
    return (
      new Intl.DisplayNames([language, 'en'], { type: 'region' }).of(
        countryCode,
      ) ?? countryCode
    );
  } catch {
    return countryCode;
  }
};

/**
 * The countries a user has Bites in, on a globe (GitHub issue #1787).
 *
 * Opened from the "Show on globe" button under a profile's flags. The globe
 * highlights the profile's `countryCodes`, the same list the flags show, and
 * names a country in the app language when it is tapped.
 */
@Component({
  selector: 'world-page',
  templateUrl: './world.component.html',
  styleUrl: './world.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonSpinner,
    GlobeComponent,
    TranslocoPipe,
  ],
})
export class WorldComponent {
  private readonly transloco = inject(TranslocoService);

  isLoading = input(false, { transform: booleanAttribute });
  displayName = input<string | undefined>();
  isOwnProfile = input(false, { transform: booleanAttribute });
  countryCodes = input<string[] | null | undefined>([]);

  /** Spin the globe until the first touch. Off in stories, for a still image. */
  autoSpin = input(true, { transform: booleanAttribute });

  countryTap = output<GlobeCountryTap>();
  zoomed = output<GlobeZoomControl>();

  selectedCountryCode = signal<string | undefined>(undefined);

  private readonly language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  countryCount = computed(
    () => normalizeCountryCodes(this.countryCodes()).length,
  );
  continentCount = computed(() => countContinents(this.countryCodes()));

  selectedCountryName = computed(() => {
    const code = this.selectedCountryCode();

    return code ? countryName(code, this.language()) : undefined;
  });
}
