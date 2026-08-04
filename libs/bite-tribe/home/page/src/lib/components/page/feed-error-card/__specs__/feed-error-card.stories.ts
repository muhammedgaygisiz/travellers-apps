import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FeedErrorCardComponent } from '../feed-error-card.component';

addNecessaryIcons();

export default {
  title: 'Components/Feed Error Card',
  component: FeedErrorCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<FeedErrorCardComponent>;

type Story = StoryObj<FeedErrorCardComponent>;

/**
 * What the Home loading state resolves into when a feed synchronization does
 * not deliver bites. The bites already known stay on screen underneath, so the
 * card reports the failure without taking the feed away (issue #1230).
 */
export const Default: Story = {};
