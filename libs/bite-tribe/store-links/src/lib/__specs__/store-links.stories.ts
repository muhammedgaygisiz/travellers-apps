import { applicationConfig, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { StoreLinksComponent } from '../store-links.component';

export default {
  title: 'Components/Store Links',
  component: StoreLinksComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
};

type Story = StoryObj<StoreLinksComponent>;

/**
 * One story for two layouts, which is not laziness but how the breakpoint is
 * reachable at all.
 *
 * The switch between the codes and the badges is a viewport media query, so a
 * fixed-width wrapper around the story cannot move it - only the width of the
 * capture itself can. Loki already renders every story at both `chrome.laptop`
 * (1366px) and `chrome.iphone7` (375px), which sit either side of the 600px
 * breakpoint, so this single story baselines the QR codes and the store badges
 * both. Two stories declaring `parameters.viewport` would baseline the same
 * layout twice: Loki loads `iframe.html?id=...` directly and the viewport addon
 * never runs.
 *
 * Browsing it by hand needs the Storybook viewport toolbar rather than a story
 * switch, for the same reason.
 */
export const Primary: Story = {};
