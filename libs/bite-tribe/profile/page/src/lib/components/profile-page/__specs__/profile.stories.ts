import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ProfileComponent } from '../profile.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, Like, PublicUser } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/Profile',
  component: ProfileComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<ProfileComponent>;

type Story = StoryObj<ProfileComponent>;
export const Default: Story = {
  args: {
    user: {
      userId: '1',
      about: "It's me, Mario!",
      city: 'Berne',
      displayName: 'Mo',
      photoUrl: '',
    } as PublicUser,
    bites: [
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
    ],
  },
};

export const withoutBites: Story = {
  args: {
    user: {
      about: "It's me, Mario!",
      city: 'Berne',
      displayName: 'Mo',
      photoUrl: '',
    } as PublicUser,
    bites: [],
  },
};

export const ownProfile: Story = {
  args: {
    user: {
      about: "It's me, Mario!",
      city: 'Berne',
      displayName: 'Mo',
      photoUrl: '',
    } as PublicUser,
    bites: [],
  },
};
