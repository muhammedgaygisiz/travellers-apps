import { CardComponent } from '../card.component';

export default {
  title: 'Kosaml/Base/Card',
  component: CardComponent,
};

export const emptyCard = () => ({});

export const cardWithContent = () => ({
  template: `
    <kosaml-card>Some content</kosaml-card>
  `,
});
