import {CardComponent} from "../card.component";
import {Meta, moduleMetadata, Story} from "@storybook/angular";
import {IonicModule} from "@ionic/angular";
import {CardFeatureModule} from "@travellers-apps/prices/card/feature";
import {getIonicConfig} from "@travellers-apps/utils-common";

export default {
  title: 'Card Component',
  component: CardComponent,
  decorators: [
    moduleMetadata({
      imports: [
        IonicModule.forRoot(getIonicConfig()),
        CardFeatureModule
      ]
    })
  ]
} as Meta<CardComponent>;

const Template: Story<CardComponent> = (args: CardComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {
  entry: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
    name: 'Peaches',
    price: 0.2,
  }
};
