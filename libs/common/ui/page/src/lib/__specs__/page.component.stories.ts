import { PageComponent } from '../page.component';
import {
  applicationConfig,
  argsToTemplate,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Components/Page',
  component: PageComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  render: (args) => ({
    props: {
      ...args,
    },
    template: `
    <ta-page ${argsToTemplate(args)}>
        <p>Some dummy content</p>
      </ta-page>
`,
  }),
} as Meta<PageComponent>;

type Story = StoryObj<PageComponent>;
export const Primary: Story = {
  args: {
    enableBackButton: false,
  },
};
