import { moduleMetadata } from '@storybook/angular';
import { CardComponent } from '../card.component';
import { KosamlCardFeatureModule } from '../kosaml-card-feature.module';

export default {
  title: 'Kosaml/Base/Card',
  decorators: [
    moduleMetadata({
      imports: [KosamlCardFeatureModule],
    }),
  ],
};

export const emptyCard = () => ({
  component: CardComponent,
});
