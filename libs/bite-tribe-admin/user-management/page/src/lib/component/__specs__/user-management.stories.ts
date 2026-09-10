import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { AdminUser } from 'bite-tribe-admin/user-management-data-access';
import { UserManagementComponent } from '../user-management.component';

addNecessaryIcons();

// The timestamps below are fixed strings, which is the opposite of what a story
// normally does with a date. The usual rule - pin time-dependent data to an
// offset from now, so a reference does not age into `1 y 2 m ago` on its own -
// exists because the component renders a *relative* time. This page renders
// `lastSignInAt` verbatim, so an offset would put a different string in the
// image on every capture and the reference could never pass twice. See
// Implementation - Storybook, "Story Data Must Not Move On Its Own".

const operator: AdminUser = {
  uid: 'operator-uid',
  email: 'operator@bitetribe.app',
  displayName: 'Sam Operator',
  roles: ['admin'],
  disabled: false,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '2025-08-04T09:12:41.000Z',
  lastSignInAt: '2026-09-08T07:31:02.000Z',
  subscriptionTier: 1,
};

const restaurateur: AdminUser = {
  uid: 'restaurateur-uid',
  email: 'giulia@trattoria-roma.it',
  displayName: 'Giulia Bianchi',
  roles: ['business'],
  disabled: false,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '2026-05-13T18:44:09.000Z',
  lastSignInAt: '2026-09-07T12:05:55.000Z',
  subscriptionTier: 0,
};

/** An account nobody has decided a tier for: `null` is not Free. */
const member: AdminUser = {
  uid: 'member-uid',
  email: 'noah.friedrich@example.com',
  displayName: 'Noah Friedrich',
  roles: [],
  disabled: false,
  emailVerified: false,
  providerIds: ['google.com'],
  createdAt: '2026-08-10T21:19:30.000Z',
  lastSignInAt: '2026-09-09T06:48:12.000Z',
  subscriptionTier: null,
};

const blocked: AdminUser = {
  uid: 'blocked-uid',
  email: 'spam.account@example.com',
  displayName: 'Spam Account',
  roles: [],
  disabled: true,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '2026-09-01T14:02:17.000Z',
  lastSignInAt: '2026-09-04T03:27:48.000Z',
  subscriptionTier: 0,
};

/**
 * An account holding `business` and `staff` at once.
 *
 * `setUserRoles` refuses the pair, but a document written before it did can
 * still carry both, and the page has to say so rather than let the save fail.
 */
const conflicted: AdminUser = {
  uid: 'conflicted-uid',
  email: 'marco@osteria-vecchia.it',
  displayName: 'Marco Ricci',
  roles: ['business', 'staff'],
  disabled: false,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '2026-02-12T11:38:20.000Z',
  lastSignInAt: '2026-09-06T19:53:36.000Z',
  subscriptionTier: 0,
};

const users: AdminUser[] = [
  operator,
  restaurateur,
  member,
  conflicted,
  blocked,
];

export default {
  title: 'Admin/User Management',
  component: UserManagementComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: {
    users,
    loading: false,
    saving: false,
    savingTier: false,
    savingBlocked: false,
    selected: undefined,
    operatorUid: operator.uid,
  },
} as Meta<UserManagementComponent>;

type Story = StoryObj<UserManagementComponent>;

/**
 * The account list is loaded and nothing is selected yet, so the right column
 * says what to do rather than showing an empty form.
 */
export const NoSelection: Story = {};

/** The callable is still following its page token. */
export const Loading: Story = {
  args: { users: [], loading: true },
};

/**
 * No accounts at all - a broken load or an empty project, and deliberately not
 * the same message as a filter that matched nothing.
 */
export const Empty: Story = {
  args: { users: [] },
};

/**
 * A restaurant account selected: the identity fields read-only, the role
 * checkboxes and the tier radio editable, and blocking in its own section
 * below both.
 */
export const SelectedAccount: Story = {
  args: { selected: restaurateur },
};

/** An account with no `/users` document, so it has no tier rather than Free. */
export const AccountWithoutTier: Story = {
  args: { selected: member },
};

/**
 * Already blocked, so the section offers to let the account back in. Unblocking
 * confirms too, because a misclick would silently re-admit an account somebody
 * deliberately stopped.
 */
export const BlockedAccount: Story = {
  args: { selected: blocked },
};

/**
 * The operator looking at their own account. Only an admin can unblock, so
 * blocking yourself would take the tool that lets you back in with you; the
 * refusal reads as a reason next to the button rather than as a failed save.
 */
export const OwnAccount: Story = {
  args: { selected: operator },
};

/**
 * `business` and `staff` held together. The save is disabled and says why,
 * which is the same shape the self-block refusal uses.
 */
export const RolesConflict: Story = {
  args: { selected: conflicted },
};

/** A save in flight: the button shows progress and the tap is blocked. */
export const SavingRoles: Story = {
  args: { selected: restaurateur, saving: true },
};
