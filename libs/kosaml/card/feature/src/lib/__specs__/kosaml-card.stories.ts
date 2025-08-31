import { CardComponent } from '../card.component';

export default {
  title: 'Kosaml/Base/Card',
  component: CardComponent,
};

export const EmptyCard = (): any => ({});

export const CardWithContent = (): any => ({
  template: `
    <kosaml-card>Some content</kosaml-card>
  `,
});
