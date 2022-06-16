import {IonicModule} from '@ionic/angular';
import {Meta, moduleMetadata, Story} from '@storybook/angular';
import {
  HomeComponent,
  HomeComponentModule,
} from '@travellers-apps/prices/home/feature';
import {FooterToolBarComponent} from "../../../libs/prices/footer-tool-bar/feature/src/lib/footer-tool-bar.component";
import {FooterToolBarFeatureModule} from "@travellers-apps/prices/footer-tool-bar/feature";
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
