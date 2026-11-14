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

/**
 * A weekly top-3 finisher (issue #2031): one badge per list under the globe
 * button, gold and bronze, each opening the standings it was won in.
 */
export const WithWeeklyBadges: Story = {
  args: {
    user: {
      ...baseUser,
      countryCodes: ['CH', 'BA', 'TR'],
      weeklyBadges: [
        { board: 'thisWeek', place: 1, week: '2026-11-09' },
        { board: 'mostLiked', place: 3, week: '2026-11-09' },
      ],
    },
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

/** Somebody else's public profile with pronouns after the name (#1826). */
export const WithPronouns: Story = {
  args: {
    user: { ...baseUser, pronouns: 'they/them' },
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

/**
 * Pronouns close to the 40-character limit, beside a long display name: they wrap
 * under it rather than pushing the badge or the follow button off the row.
 */
export const WithLongPronouns: Story = {
  args: {
    user: {
      ...baseUser,
      displayName: 'Wanderlust Gourmet',
      pronouns: 'they/them, she/her, elle/iel, sie/ihr',
    },
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

/**
 * A newly chosen photo still uploading: the previous one stays on show
 * (GitHub issue #1953). No start time, so the story never turns into the
 * failed state while it is being captured.
 */
export const OwnProfilePhotoUploading: Story = {
  args: {
    user: {
      ...baseUser,
      userId: currentUserId,
      photoStatus: 'pending',
    },
    pendingPhoto: 'assets/demo/bite-demo.png',
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

/** The new photo never arrived; the owner is offered a retry (#1953). */
export const OwnProfilePhotoFailed: Story = {
  args: {
    user: {
      ...baseUser,
      userId: currentUserId,
      photoStatus: 'failed',
    },
    pendingPhoto: 'assets/demo/bite-demo.png',
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

/**
 * After a reload on a device that no longer holds the new photo, the
 * previous one is blurred instead - here the placeholder (#1953).
 */
export const OwnProfilePhotoFailedWithoutLocalCopy: Story = {
  args: {
    user: {
      ...baseUser,
      userId: currentUserId,
      photoStatus: 'failed',
    },
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
};

/** Somebody else's photo upload is nobody else's business (#1953). */
export const OtherProfilePhotoFailed: Story = {
  args: {
    user: { ...baseUser, photoStatus: 'failed' },
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

// Another account's private profile. The rules refuse its document, so the
// page receives a stand-in holding the uid alone, while the Bites still arrive
// by the route and must not be shown (issue #1863).
export const OtherPrivateProfile: Story = {
  args: {
    user: {
      userId: 'profile-owner',
      public: false,
      displayName: '',
      email: '',
      photoUrl: '',
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

/** The profile of an account the signed-in user blocked (GitHub issue #1609). */
export const BlockedAccount: Story = {
  args: {
    user: baseUser,
    userId: currentUserId,
    profileMetadata: noProfileMetadata,
    bites: [bite],
    isBlocked: true,
  },
};

/**
 * Somebody else's profile with its header menu open, where Report and Block
 * live so that Follow stays the one prominent action (GitHub issues #1609 and
 * #1829).
 */
export const ActionsMenuOpen: Story = {
  args: {
    user: baseUser,
    userId: currentUserId,
    profileMetadata,
    bites: [bite],
  },
  play: async ({ canvasElement }) => {
    canvasElement
      .querySelector<HTMLElement>('[data-testid="profile-actions-menu"]')
      ?.click();
  },
};

/**
 * A blocked account's header menu: Block has gone with the block, and Report
 * stays, because blocking protects only the person who blocks (GitHub issue
 * #1829).
 */
export const BlockedAccountActionsMenuOpen: Story = {
  args: {
    user: baseUser,
    userId: currentUserId,
    profileMetadata: noProfileMetadata,
    bites: [bite],
    isBlocked: true,
  },
  play: async ({ canvasElement }) => {
    canvasElement
      .querySelector<HTMLElement>('[data-testid="profile-actions-menu"]')
      ?.click();
  },
};
