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
        { provide: APP_TITLE, useValue: 'BiteTribe' },
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
 * The desktop layout, which a page opts into with `chrome.desktopLayout`. Above
 * 1024px the content column widens past the phone column, the first three menu
 * entries and the add button move into the header, and the fixed footer bar is
 * released. Narrow the viewport below the breakpoint and the same page renders
 * exactly like Primary — the switch is a media query, not component state.
 * See GitHub issue #1250.
 */
export const DesktopLayout: Story = {
  args: {
    chrome: {
      enableBackButton: false,
      desktopLayout: true,
      showAddButton: true,
    },
    isAuthenticated: true,
    menuConfig: {
      myProfile: true,
      myBites: true,
      myBucketlists: true,
      settings: true,
      about: true,
      gallery: true,
    },
  },
};

/**
 * The same page signed out. Every promoted entry leads to the visitor's own
 * content, so none is promoted and the header keeps only the add button.
 */
export const DesktopLayoutSignedOut: Story = {
  args: {
    ...DesktopLayout.args,
    isAuthenticated: false,
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

/**
 * The add button while its target is still opening. Reaching the Create Bite
 * page is a guard round-trip plus a lazy chunk, so the button locks behind a
 * spinner and the pending label rather than leaving the tap unanswered.
 * See GitHub issue #1287.
 */
export const AddButtonPending: Story = {
  args: {
    chrome: {
      enableBackButton: false,
      showAddButton: true,
    },
    loading: true,
    addButtonPending: true,
  },
};
