import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { IonApp, provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CountrySelectorComponent } from '../country-selector.component';

addNecessaryIcons();

export default {
  title: 'Components/Country Selector',
  component: CountrySelectorComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [CountrySelectorComponent, IonApp],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <ion-app>
        <div style="height: 100vh">
        <country-selector
          [selectedCountry]="selectedCountry"
          [leftButtonLangCode]="leftButtonLangCode"
        />
        </div>
      </ion-app>
    `,
  }),
} as Meta<CountrySelectorComponent>;

type Story = StoryObj<CountrySelectorComponent>;

/**
 * Every story drives the list through the searchbar rather than showing all 244
 * countries, and the terms are chosen so only flat, straight-edged flags render.
 *
 * `flag-icons` draws emblem-bearing flags - Portugal's armillary sphere,
 * Cambodia's Angkor Wat, the British ensigns - as fine white line-art inside a
 * ~28px box, and those rasterize differently between a local arm64 renderer and
 * CI's amd64. The unfiltered list failed Loki on 178 of its 244 rows, with every
 * differing pixel inside the flag column. The CIEDE2000 tolerance is global
 * (2.5) and cannot be raised for one story without blinding the whole suite, so
 * the fixtures avoid those flags instead. Same rule as `Pages/Profile`.
 */
const searchFor = (canvasElement: HTMLElement, term: string): void => {
  const searchbar = canvasElement.querySelector('ion-searchbar');

  if (!searchbar) {
    return;
  }

  (searchbar as HTMLIonSearchbarElement).value = term;
  searchbar.dispatchEvent(new CustomEvent('ionInput'));
};

/**
 * Type-ahead over the localized name. "den" sits in the middle of both matches,
 * so this also shows that matching is not limited to a prefix.
 */
export const SearchResult: Story = {
  args: {
    selectedCountry: undefined,
    leftButtonLangCode: 'cancel',
  },
  play: ({ canvasElement }) => searchFor(canvasElement, 'den'),
};

/** Reopened after a pick, so the current country is marked and highlighted. */
export const WithSelection: Story = {
  args: {
    ...SearchResult.args,
    selectedCountry: 'DK',
  },
  play: SearchResult.play,
};

/** Nothing matches, so the list makes that explicit instead of going blank. */
export const NoResults: Story = {
  args: {
    ...SearchResult.args,
  },
  play: ({ canvasElement }) => searchFor(canvasElement, 'zzzzzz'),
};
