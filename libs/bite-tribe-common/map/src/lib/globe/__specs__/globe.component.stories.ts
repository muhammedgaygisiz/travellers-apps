import { Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons } from 'utils';
import { GlobeComponent } from '../globe.component';

addNecessaryIcons();

/**
 * The visited-countries globe (GitHub issue #1787). Every story keeps the
 * globe still, so the visual baseline is one frame rather than wherever the
 * spin happened to be when Loki took the picture.
 */
export default {
  title: 'Components/Globe',
  component: GlobeComponent,
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 420px; margin: 0 auto;">
        <bt-globe
          [countryCodes]="countryCodes"
          [autoSpin]="autoSpin"
          [selectedCountryCode]="selectedCountryCode"
        />
      </div>
    `,
  }),
} as Meta<GlobeComponent>;

type Story = StoryObj<GlobeComponent>;

/** Countries on three continents; the globe faces the middle of them. */
export const Visited: Story = {
  args: {
    countryCodes: ['AT', 'DE', 'IT', 'FR', 'TR', 'AE', 'TH'],
    autoSpin: false,
  },
};

/** A tapped country is drawn darker than the other highlighted ones. */
export const Selected: Story = {
  args: {
    ...Visited.args,
    selectedCountryCode: 'TH',
  },
};

/**
 * Singapore and Malta are too small for the coarse outlines, so the globe
 * loads the fine ones and draws them as dots at this zoom.
 */
export const SmallCountries: Story = {
  args: {
    countryCodes: ['SG', 'MT', 'MY'],
    autoSpin: false,
  },
};

/** No countries: a plain globe, facing Europe. */
export const NoCountries: Story = {
  args: {
    countryCodes: [],
    autoSpin: false,
  },
};
