import { CardComponent } from '../card.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';

export default {
  title: 'Components/Card',
  component: CardComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<CardComponent>;

type Story = StoryObj<CardComponent>;

export const Empty: Story = {
  render: () => ({
    template: `
      <ta-card>
        <div class="ion-margin">
          Cart Content has to take care of its own margin
        </div>
      </ta-card>
    `,
  }),
};

export const Primary: Story = {
  args: {
    entry: {
      id: 'some-id',
      src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
      name: 'Peaches',
      price: 0.2,
    },
  },
  render: (args) => ({
    props: { ...args },
    template: `
      <ta-card>
      <ion-card-header>
        <ion-card-title>Marrakech</ion-card-title>
        <ion-card-subtitle>MOST SEARCHED IN</ion-card-subtitle>
      </ion-card-header>

      <ion-card-content>
        <div>
          <img [src]="entry?.src"/>
          <h2>{{entry?.name}}</h2>
          <h1>{{entry?.price | currency}}</h1>
        </div>
      </ion-card-content>
    </ta-card>
    `,
  }),
};
