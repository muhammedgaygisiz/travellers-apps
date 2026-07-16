import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { LanguageStepComponent } from '../language-step.component';

export default {
  title: 'Pages/Onboarding/Language Step',
  component: LanguageStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    language: 'en',
  },
} as Meta<LanguageStepComponent>;

type Story = StoryObj<LanguageStepComponent>;

/** Prefilled from the device locale. */
export const EnglishPrefilled: Story = {};

export const NonDefaultLanguage: Story = {
  args: {
    language: 'de',
  },
};
