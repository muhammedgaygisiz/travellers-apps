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
    chrome: {
      enableBackButton: false,
    },
  },
};

/**
 * A background refresh of content that is already on screen. The indeterminate
 * bar sits over the header separator, so the page it reports on does not move.
 */
export const Loading: Story = {
  args: {
    ...Primary.args,
    loading: true,
  },
};
