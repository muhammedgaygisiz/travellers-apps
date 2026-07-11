import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ProfileComponent } from '../profile.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, BiteTrail, Like, ProfileMetaData, PublicUser } from 'model';

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

const currentUserId = 'current-user';

const profileMetadata: ProfileMetaData = {
  followers: 12,
  following: 7,
  isFollowedByMe: false,
};

const noProfileMetadata: ProfileMetaData = {
  followers: 0,
  following: 0,
  isFollowedByMe: false,
};

const baseUser: PublicUser = {
  userId: 'profile-owner',
  about: "It's me, Mario!",
  city: 'Berne',
  displayName: 'Mo',
  fullName: 'Muhammed Gaygisiz',
  email: 'mo@example.com',
  photoUrl: '',
  public: true,
  subscriptionTier: 1,
  countryCodes: ['CH', 'IT', 'DE', 'FR', 'JP'],
};

const bite: Bite = {
  id: 'bite1',
  name: 'Botanic Breeze',
  imagePath:
    'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
  place: 'Einstein au Jardin',
  distance: '0.6',
  rating: 3,
  likes: [{ likeType: 'thumbup' } as Like],
} as Bite;

const biteTrail: BiteTrail = {
  id: 'trail1',
  ownerId: 'organisation-owner',
  name: 'Bern Brunch Walk',
  biteIds: ['bite1', 'bite2', 'bite3'],
  soldCount: 24,
  imagePath:
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&auto=format&fit=crop',
  image: '',
  ownerImagePath: '',
  ownerName: 'Bite Tribe',
  location: 'Bern',
  description: 'A compact morning route through three easygoing brunch spots.',
  price: 12,
  currency: 'CHF',
};

export const Default: Story = {
  args: {
    user: baseUser,
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

export const OwnProfile: Story = {
  args: {
    user: {
      ...baseUser,
      userId: currentUserId,
    },
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

export const WithoutBites: Story = {
  args: {
    user: baseUser,
    userId: currentUserId,
    profileMetadata,
    bites: [],
  },
};

export const NewUserEmptyProfile: Story = {
  args: {
    user: {
      ...baseUser,
      about: '',
      city: '',
      displayName: '',
      fullName: '',
      subscriptionTier: 1,
    },
    userId: currentUserId,
    profileMetadata: noProfileMetadata,
    bites: [],
  },
};

export const WithManyFlags: Story = {
  args: {
    user: {
      ...baseUser,
      countryCodes: [
        'DE',
        'CH',
        'TR',
        'ES',
        'PT',
        'PS',
        'TN',
        'TH',
        'JP',
        'VN',
        'KH',
        'IT',
        'HK',
        'FR',
        'IE',
        'PE',
        'MT',
        'SE',
        'CN',
        'MA',
        'BE',
        'EE',
        'FI',
        'DK',
        'KR',
        'NO',
        'SG',
        'MY',
        'US',
      ],
    },
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

export const NoFollowersOrFollowing: Story = {
  args: {
    user: baseUser,
    userId: currentUserId,
    profileMetadata: noProfileMetadata,
    bites: [bite],
  },
};

export const OrganisationWithBiteTrails: Story = {
  args: {
    user: {
      ...baseUser,
      userId: 'organisation-owner',
      about: 'Curated food trails around Swiss cities.',
      city: 'Bern',
      displayName: 'Bite Tribe Guides',
      fullName: '',
      isOrganisation: true,
    },
    userId: currentUserId,
    profileMetadata,
    biteTrails: [biteTrail],
  },
};

export const OrganisationWithoutBiteTrails: Story = {
  args: {
    user: {
      ...baseUser,
      userId: 'organisation-owner',
      about: '',
      city: '',
      displayName: 'New Food Guide',
      fullName: '',
      isOrganisation: true,
    },
    userId: currentUserId,
    profileMetadata: noProfileMetadata,
    biteTrails: [],
  },
};
