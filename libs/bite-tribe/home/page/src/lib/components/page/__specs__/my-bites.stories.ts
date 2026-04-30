import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BiteTribeHomeComponent } from '../home.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite, Like } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/Home',
  component: BiteTribeHomeComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BiteTribeHomeComponent>;

type Story = StoryObj<BiteTribeHomeComponent>;
export const MyBites: Story = {
  args: {
    isAuthenticated: true,
    allTags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
    title: 'My Bites',
    showFooter: false,
    showHeaderMenu: false,
    enableBackButton: true,
    editableBites: true,
    bites: [
      {
        id: '1',
        name: 'Botanic Breeze',
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
      } as Bite,
      {
        id: '2',
        name: 'Botanic Breeze',
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
      } as Bite,
      {
        id: '3',
        name: 'Botanic Breeze',
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
      } as Bite,
      {
        id: '4',
        name: 'Botanic Breeze',
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
      } as Bite,
      {
        id: '5',
        name: 'Botanic Breeze',
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
      } as Bite,
      {
        id: '6',
        name: 'Botanic Breeze',
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
      } as Bite,
    ],
  },
};
