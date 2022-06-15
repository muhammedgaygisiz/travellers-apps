import {IonicModule} from '@ionic/angular';
import {Meta, moduleMetadata, Story} from '@storybook/angular';
import {
  HomeComponent,
  HomeComponentModule,
} from '@travellers-apps/prices/home/feature';
import {FooterToolBarComponent} from "../../../libs/prices/footer-tool-bar/feature/src/lib/footer-tool-bar.component";
import {FooterToolBarFeatureModule} from "@travellers-apps/prices/footer-tool-bar/feature";

export default {
  title: 'Footer Toolbar Component',
  component: FooterToolBarComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(), FooterToolBarFeatureModule],
    }),
  ],
} as Meta<FooterToolBarComponent>;

const Template: Story<FooterToolBarComponent> = (args: FooterToolBarComponent) => ({
  props: args,
  template: `
    <ion-app>
      <ion-content>
        This is some dummy content ...
      </ion-content>
      <ta-footer-tool-bar></ta-footer-tool-bar>
    </ion-app>
  `
});

export const Primary = Template.bind({});
Primary.args = {};
