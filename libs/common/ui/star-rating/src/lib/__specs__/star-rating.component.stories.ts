import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { StarRatingComponent } from '../star-rating.component';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';

export default {
  title: 'Components/Star Rating',
  component: StarRatingComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<StarRatingComponent>;

type Story = StoryObj<StarRatingComponent>;

addIcons({
  star,
  starOutline,
});

export const Primary: Story = {
  args: {
    readonly: false,
    rating: 4,
  },
};

export const Readonly: Story = {
  args: {
    ...Primary.args,
    readonly: true,
  },
};

export const Empty: Story = {
  args: {
    ...Primary.args,
    rating: undefined,
  },
};
