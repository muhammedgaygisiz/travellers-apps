import { EditProfilePage } from '../edit-profile.page';
import { Directive, OnDestroy } from '@angular/core';
import {
  applicationConfig,
  componentWrapperDecorator,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { APP_TITLE, getIonicConfig } from 'utils';
import type { PublicUser } from 'model';

const unverifiedUser: PublicUser = {
  userId: 'user-1',
  displayName: 'Traveller',
  email: 'traveller@example.com',
  photoUrl: '',
  public: true,
  emailVerified: false,
};

/**
 * Ionic moves a presented alert to `<body>`, out of Angular's tree, so it
 * outlives the story: Loki switches stories without reloading, and a leftover
 * alert would sit over every story captured after it with the page's scroll
 * still locked. Both are taken away when the story is torn down.
 */
@Directive({ selector: '[libStoryAlertCleanup]' })
class StoryAlertCleanupDirective implements OnDestroy {
  ngOnDestroy(): void {
    document.querySelectorAll('ion-alert').forEach((alert) => alert.remove());
    document.body.classList.remove('backdrop-no-scroll');
  }
}

/**
 * Switches the profile toggle as the owner would, and resolves once the alert
 * it opens has finished presenting, so the capture never catches it mid-way.
 */
const switchToPublic = async (canvasElement: HTMLElement): Promise<void> => {
  const presented = new Promise<void>((resolve) => {
    document.addEventListener('ionAlertDidPresent', () => resolve(), {
      once: true,
    });
    // A story that opens nothing must still finish.
    setTimeout(resolve, 3000);
  });

  canvasElement.querySelector<HTMLElement>('ion-toggle')?.click();
  await presented;
};

export default {
  title: 'Pages/Edit Profile',
  component: EditProfilePage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<EditProfilePage>;

type Story = StoryObj<EditProfilePage>;
export const Default: Story = {
  args: {},
};

/** The account still has to verify its email, so the resend offer is idle. */
export const EmailVerificationPrompt: Story = {
  args: {
    publicUser: unverifiedUser,
    showEmailVerificationPrompt: true,
  },
};

/** The resend callable is in flight: progress is shown and the tap is blocked. */
export const EmailVerificationResendRunning: Story = {
  args: {
    publicUser: unverifiedUser,
    showEmailVerificationPrompt: true,
    emailVerificationResendRunning: true,
  },
};

/**
 * The image check refused the new photo (GitHub issue #2140): the form keeps
 * the photo everybody else sees, says why the new one was not allowed, and
 * offers to choose a different one.
 */
export const PhotoRefused: Story = {
  args: {
    publicUser: {
      ...unverifiedUser,
      emailVerified: true,
      photoStatus: 'refused',
      photoRefusalCategory: 'violence',
    },
  },
};

/** A profile that states its pronouns, next to the display name (#1826). */
export const WithPronouns: Story = {
  args: {
    publicUser: {
      ...unverifiedUser,
      emailVerified: true,
      pronouns: 'they/them',
    },
  },
};

/**
 * A private profile with pending follow requests is switched to public
 * (GitHub issue #2168). The switch would accept every request at once, so it
 * asks first and names how many are pending.
 */
export const GoPublicWithPendingRequests: Story = {
  decorators: [
    moduleMetadata({ imports: [StoryAlertCleanupDirective] }),
    componentWrapperDecorator(
      (story) => `<div libStoryAlertCleanup>${story}</div>`,
    ),
  ],
  args: {
    publicUser: {
      ...unverifiedUser,
      emailVerified: true,
      public: false,
    },
    pendingFollowRequestCount: 3,
  },
  play: async ({ canvasElement }) => switchToPublic(canvasElement),
};
