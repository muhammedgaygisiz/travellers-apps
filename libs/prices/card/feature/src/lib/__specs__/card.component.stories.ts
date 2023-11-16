import { CardComponent } from '../card.component';
import { applicationConfig, Meta, Story } from '@storybook/angular';
import { getIonicConfig } from '@travellers-apps/utils-common';
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

const EmptyTemplate: Story<CardComponent> = (args: CardComponent) => ({
  props: args,
  template: `
    <ta-card>
        <div class="ion-margin">
          Cart Content has to take care of its own margin
        </div>
    </ta-card>`,
});

export const Empty = EmptyTemplate.bind({});
Empty.args = {};

const Template: Story<CardComponent> = (args: CardComponent) => ({
  props: args,
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
});

export const Primary = Template.bind({});
Primary.args = {
  entry: {
    id: 'some-id',
    src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
    name: 'Peaches',
    price: 0.2,
  },
};
