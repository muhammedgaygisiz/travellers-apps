import { PageComponent } from '../page.component';
import { applicationConfig, Meta, Story } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Components/Page',
  component: PageComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<PageComponent>;

const Template: Story<PageComponent> = (args: PageComponent) => ({
  props: args,
  template: `
      <ta-page
        [enableBackButton]="enableBackButton"
        [isAuthenticated]="isAuthenticated"
      >
        <p>Some dummy content</p>
      </ta-page>
  `,
});

export const Primary = Template.bind({});
Primary.args = {
  enableBackButton: false,
  isAuthenticated: true,
};
