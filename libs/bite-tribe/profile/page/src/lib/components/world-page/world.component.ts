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
import {
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
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

/** A country tapped on the globe or in the list under it. */
export interface WorldCountryTap extends GlobeCountryTap {
  source: 'globe' | 'list';
}

/** One row of the country list under the globe. */
export interface WorldCountryRow {
  countryCode: string;
  name: string;
  flagClass: string;
  /** `undefined` while the Bites are being counted, or if they could not be. */
  biteCount: number | undefined;
}

/**
 * The countries a user has Bites in, on a globe (GitHub issue #1787).
 *
 * Opened from the "Show on globe" button under a profile's flags. The globe
 * highlights the profile's `countryCodes`, the same list the flags show, and
 * names a country in the app language when it is tapped. Under it, the same
 * countries are listed with how many Bites the user has in each, most first;
 * a row turns the globe to its country.
 */
@Component({
  selector: 'world-page',
  templateUrl: './world.component.html',
  styleUrl: './world.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
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

  /** Bites per alpha-2 code. Rows show no numbers until it arrives. */
  biteCounts = input<Record<string, number> | undefined>();

  /** Spin the globe until the first touch. Off in stories, for a still image. */
  autoSpin = input(true, { transform: booleanAttribute });

  countryTap = output<WorldCountryTap>();
  zoomed = output<GlobeZoomControl>();

  selectedCountryCode = signal<string | undefined>(undefined);

  private readonly language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  countryCount = computed(
    () => normalizeCountryCodes(this.countryCodes()).length,
  );
  continentCount = computed(() => countContinents(this.countryCodes()));

  rows = computed((): WorldCountryRow[] => {
    const language = this.language();
    const counts = this.biteCounts();

    return normalizeCountryCodes(this.countryCodes())
      .map((countryCode) => ({
        countryCode,
        name: countryName(countryCode, language),
        flagClass: `fi fi-${countryCode.toLowerCase()}`,
        biteCount: counts ? (counts[countryCode] ?? 0) : undefined,
      }))
      .sort(
        (a, b) =>
          (b.biteCount ?? 0) - (a.biteCount ?? 0) ||
          a.name.localeCompare(b.name, language),
      );
  });

  onGlobeTap(tap: GlobeCountryTap): void {
    this.countryTap.emit({ ...tap, source: 'globe' });
  }

  onRowTap(countryCode: string): void {
    this.selectedCountryCode.set(countryCode);
    this.countryTap.emit({ countryCode, visited: true, source: 'list' });
  }

  selectedCountryName = computed(() => {
    const code = this.selectedCountryCode();

    return code ? countryName(code, this.language()) : undefined;
  });
}
