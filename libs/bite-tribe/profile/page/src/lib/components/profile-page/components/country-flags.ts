import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export interface CountryFlag {
  countryCode: string;
  cssClass: string;
  name: string;
}

let countryNameFormatter: Intl.DisplayNames | undefined;

const getCountryName = (countryCode: string): string => {
  try {
    countryNameFormatter ??= new Intl.DisplayNames(['en'], { type: 'region' });

    return countryNameFormatter.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
};

@Component({
  selector: 'country-flags',
  templateUrl: 'country-flags.html',
  styleUrl: 'country-flags.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryFlags {
  countryCodes = input<string[] | undefined>();

  flags = computed<CountryFlag[]>(() => {
    const countryCodes = this.countryCodes() ?? [];
    const seen = new Set<string>();
    const flags: CountryFlag[] = [];

    for (const rawCode of countryCodes) {
      const countryCode = rawCode?.trim().toUpperCase();

      if (!countryCode || seen.has(countryCode)) {
        continue;
      }

      seen.add(countryCode);
      flags.push({
        countryCode,
        cssClass: `fi fi-${countryCode.toLowerCase()}`,
        name: getCountryName(countryCode),
      });
    }

    return flags;
  });
}
