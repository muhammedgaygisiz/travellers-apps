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
  imagePath: 'assets/demo/bite-demo.png',
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
  imagePath: 'assets/demo/bite-demo.png',
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

// This story covers how a long list of flags wraps, so the specific countries
// are arbitrary padding. Keep them to flat-colour, straight-edged flags: the
// emblem-bearing ones (Portugal's armillary sphere, Cambodia's Angkor Wat)
// rasterize fine white line-art into a ~25x19px box, where a sub-pixel
// difference between renderers swings a pixel clean across a colour boundary
// and exceeds any sane `chromeTolerance`. They were the sole cause of this
// story's visual-regression failures.
export const WithManyFlags: Story = {
  args: {
    user: {
      ...baseUser,
      countryCodes: [
        'DE',
        'CH',
        'TR',
        'ES',
        'NL',
        'PS',
        'TN',
        'TH',
        'JP',
        'VN',
        'AT',
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
