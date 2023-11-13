import { CardComponent } from '../card.component';

export default {
  title: 'Kosaml/Base/Card',
  component: CardComponent,
};

export const EmptyCard = () => ({});

export const CardWithContent = () => ({
  template: `
    <kosaml-card>Some content</kosaml-card>
  `,
});
