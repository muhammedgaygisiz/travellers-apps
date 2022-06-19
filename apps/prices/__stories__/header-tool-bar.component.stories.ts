import {IonicModule} from '@ionic/angular';
import {Meta, moduleMetadata, Story} from '@storybook/angular';
import {HeaderToolBarComponent} from "../../../libs/prices/header-tool-bar/feature/src/lib/header-tool-bar.component";
import {HeaderToolBarFeatureModule} from "@travellers-apps/prices/header-tool-bar/feature";

export default {
  title: 'Header Toolbar Component',
  component: HeaderToolBarComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(), HeaderToolBarFeatureModule],
    }),
  ],
} as Meta<HeaderToolBarComponent>;

const Template: Story<HeaderToolBarComponent> = (args: HeaderToolBarComponent) => ({
  props: args,
  template: `
    <ion-app>
      <ta-header-tool-bar></ta-header-tool-bar>
      <ion-content>
        This is some dummy content ...
      </ion-content>
    </ion-app>
  `
});

export const Primary = Template.bind({});
Primary.args = {};
