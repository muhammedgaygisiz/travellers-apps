import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { LikesComponent } from '../likes.component';

export default {
  title: 'Components/Likes',
  component: LikesComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<LikesComponent>;

type Story = StoryObj<LikesComponent>;

export const NoLikes: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 0, drooling: 0, mindblown: 0 },
  },
};

export const WithLikes: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 2, drooling: 1, mindblown: 0 },
  },
};

export const LikedByMe: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 2, drooling: 1, mindblown: 0 },
    userLikeType: 'thumbup',
  },
};
