import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { IconsOnlyComponent } from '../icons-only.component';

addNecessaryIcons();

const meta: Meta<IconsOnlyComponent> = {
  title: 'Prototypes/Intro Story/A Icons Only',
  component: IconsOnlyComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Abstract icons-only baseline. Compare against B/C/D which embed real BiteTribe pages.',
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  render: () => ({
    template: `
      <ion-app>
        <div style="width: 100%; height: 100vh; max-width: 430px; margin: 0 auto;">
          <intro-icons-only />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<IconsOnlyComponent>;

export const Interactive: Story = {};
