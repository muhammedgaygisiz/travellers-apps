import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { KineticChaptersComponent } from '../kinetic-chapters.component';

addNecessaryIcons();

const meta: Meta<KineticChaptersComponent> = {
  title: 'Prototypes/Intro Story/D Real UI Chapters',
  component: KineticChaptersComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Chapter wizard showcase of scaled real BiteTribe screens (non-interactive UI; chrome advances).',
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  render: () => ({
    template: `
      <ion-app style="width: 100%; height: 100%;">
        <div style="box-sizing: border-box; width: 100%; height: 100vh; max-width: 430px; margin: 0 auto;">
          <intro-kinetic-chapters />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<KineticChaptersComponent>;

export const Interactive: Story = {};
