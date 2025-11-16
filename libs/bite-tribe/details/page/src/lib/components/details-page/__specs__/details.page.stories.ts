import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DetailsPage } from '../details.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { Bite, Like, PublicUser } from 'model';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Bite',
  component: DetailsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<DetailsPage>;

type Story = StoryObj<DetailsPage>;
export const Default: Story = {
  args: {
    isAuthenticated: true,
    bite: {
      imagePath:
        'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
      name: 'Botanic Breeze',
      rating: 3,
      place: 'Einstein au Jardin',
      distance: '0.6',
      likes: [{ likeType: 'thumbup' } as Like],
      position: {
        longitude: 7.452407777309418,
        latitude: 46.94654339581695,
      },
      tags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
      price: '9',
      currency: 'CHF',
    } as unknown as Bite,
    biteCreator: {
      userId: '1',
      displayName: 'Mo',
      photoUrl:
        'https://lh3.googleusercontent.com/a/ACg8ocKHFN9hwLoWCBJfmCvVTe7e52JATaD9YpcXPwQ6ucMTEiqOuarL=s96-c',
    } as PublicUser,
  },
};

export const withDescription: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args!.bite,
      description:
        'A refreshing blend of botanical flavors, perfect for a sunny day in the city. This drink combines herbal notes with a hint of citrus, creating a delightful and invigorating experience.',
    } as unknown as Bite,
  },
};

export const withPreferredCurrency: Story = {
  args: {
    ...withDescription.args,
    bite: {
      ...withDescription.args!.bite,
      priceInPreferredCurrency: '9.6',
      priceInPreferredCurrencySymbol: 'EUR',
    } as unknown as Bite,
  },
};

export const myBite: Story = {
  args: {
    ...withDescription.args,
    userId: '1',
  },
};
