import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, StoryObj } from '@storybook/angular';
import { StartComponent } from '../start.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';

addNecessaryIcons();

export default {
  title: 'Pages/Start',
  component: StartComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
        provideRouter([]),
      ],
    }),
  ],
};

type Story = StoryObj<StartComponent>;

/** The web start page, which is what a browser renders (issues #1706, #1714). */
export const Primary: Story = {};

/**
 * The iOS start page, with Apple before Google. A browser never reaches the
 * native layout on its own, so the story sets the platform input.
 */
export const Native: Story = {
  args: { platform: 'ios' },
};

/** The Android start page, with Google before Apple. */
export const NativeAndroid: Story = {
  args: { platform: 'android' },
};
