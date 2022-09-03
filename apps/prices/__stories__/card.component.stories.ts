import {CardComponent} from "../../../libs/prices/card/feature/src/lib/card.component";
import {Meta, moduleMetadata, Story} from "@storybook/angular";
import {IonicModule} from "@ionic/angular";
import {ionicConfig} from "./utils/commons";
import {CardFeatureModule} from "@travellers-apps/prices/card/feature";

export default {
  title: 'Card Component',
  component: CardComponent,
  decorators: [
    moduleMetadata({
      imports: [
        IonicModule.forRoot(ionicConfig),
        CardFeatureModule
      ]
    })
  ]
} as Meta<CardComponent>;

const Template: Story<CardComponent> = (args: CardComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {};
