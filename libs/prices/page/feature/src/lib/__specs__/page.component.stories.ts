import {PageComponent} from "../page.component";
import {Meta, moduleMetadata, Story} from "@storybook/angular";
import {IonicModule} from "@ionic/angular";
import {getIonicConfig} from "@travellers-apps/utils-common";
import {PageFeatureModule} from "@travellers-apps/prices/page/feature";
import {RouterTestingModule} from "@angular/router/testing";

export default {
  title: 'Components/Page',
  component: PageComponent,
  decorators: [
    moduleMetadata({
      imports: [
        IonicModule.forRoot(getIonicConfig()),
        PageFeatureModule,
        RouterTestingModule
      ]
    })
  ]
} as Meta<PageComponent>;

const Template: Story<PageComponent> = (args: PageComponent) => ({
  props: args,
  template: `
      <ta-page [enableBackButton]="enableBackButton">
        <p>Some dummy content</p>
      </ta-page>
  `
});

export const Primary = Template.bind({});
Primary.args = {
  enableBackButton: false
};
