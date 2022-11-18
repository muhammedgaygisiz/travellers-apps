import { moduleMetadata } from '@storybook/angular';
import { SharedModule } from '../../..';
import { CardComponent } from '../card.component';

export default {
  title: 'Card',
  decorators: [
    moduleMetadata({
      imports: [SharedModule],
    }),
  ],
};

export const emptyCard = () => ({
  component: CardComponent,
});
