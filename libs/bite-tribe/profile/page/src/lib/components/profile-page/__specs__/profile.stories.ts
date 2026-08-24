import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ProfileComponent } from '../profile.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, Like, ProfileMetaData, PublicUser } from 'model';

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

export const Loading: Story = {
  args: {
    isLoading: true,
    user: undefined,
    userId: currentUserId,
  },
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

export const OwnPrivateProfile: Story = {
  args: {
    user: {
      ...baseUser,
      userId: currentUserId,
      public: false,
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

// An account created through onboarding before issue #1270: `fullName` holds a
// copy of the display name and no city was ever collected, which is what made
// the profile read its own name twice above "No location". The meta line is
// expected to be absent here, not to repeat the heading.
export const OnboardedAccountWithDuplicatedName: Story = {
  args: {
    user: {
      ...baseUser,
      about: '',
      city: '',
      displayName: 'run5mo',
      fullName: 'run5mo',
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
