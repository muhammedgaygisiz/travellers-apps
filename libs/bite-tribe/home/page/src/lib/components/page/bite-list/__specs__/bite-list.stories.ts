import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import type { Bite, Like } from 'model';
import { BiteListComponent } from '../bite-list.component';

addNecessaryIcons();

const bites: Bite[] = [
  {
    id: 'bite1',
    name: 'Botanic Breeze',
    imagePath:
      'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
    place: 'Einstein au Jardin',
    distance: '0.6',
    rating: 3,
    likes: [{ likeType: 'thumbup' } as Like],
  } as Bite,
  {
    id: 'bite2',
    name: 'Sunset Sushi',
    imagePath:
      'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
    place: 'Sushi Bar',
    distance: '1.2',
    rating: 4,
    likes: [] as Like[],
  } as Bite,
];

export default {
  title: 'Components/Bite List',
  component: BiteListComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<BiteListComponent>;

type Story = StoryObj<BiteListComponent>;

export const Default: Story = {
  args: {
    bites,
  },
};

export const Empty: Story = {
  args: {
    bites: [],
  },
};

export const WithTriedOutCheckbox: Story = {
  args: {
    bites,
    showTriedOutCheckbox: true,
    triedOutBiteIds: ['bite1'],
  },
};

export const HasMore: Story = {
  args: {
    bites,
    hasMore: true,
  },
};

export const Loading: Story = {
  args: {
    bites,
    showSkeleton: true,
  },
};
