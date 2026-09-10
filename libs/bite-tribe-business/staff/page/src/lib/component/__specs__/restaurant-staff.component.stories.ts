import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RestaurantStaffMember } from 'bite-tribe-business/staff-data-access';
import { RestaurantStaffComponent } from '../restaurant-staff.component';

addNecessaryIcons();

const staff: RestaurantStaffMember[] = [
  {
    uid: 'staff-giulia',
    email: 'giulia@trattoria-roma.it',
    displayName: 'Giulia',
    addedBy: 'owner-trattoria',
    addedAt: '2026-09-01T08:12:00.000Z',
  },
  {
    uid: 'staff-marco',
    email: 'marco@trattoria-roma.it',
    displayName: 'Marco',
    addedBy: 'owner-trattoria',
    addedAt: '2026-09-04T16:40:00.000Z',
  },
];

export default {
  title: 'Business/Restaurant Staff',
  component: RestaurantStaffComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: {
    staff,
    restaurantName: 'Trattoria Roma',
    isAuthenticated: true,
  },
} as Meta<RestaurantStaffComponent>;

type Story = StoryObj<RestaurantStaffComponent>;

/** Two people on the restaurant, and the form that adds a third. */
export const Default: Story = {};

/**
 * The ordinary starting state. A restaurant begins with nobody on it, so the
 * empty list is a sentence rather than a blank card — and the form under it is
 * the whole point of the page.
 */
export const Empty: Story = {
  args: { staff: [] },
};

/** The list is still being read, so no empty state is claimed prematurely. */
export const Loading: Story = {
  args: { staff: [], loading: true },
};

/**
 * A grant or a removal is in flight. Both the add button and every remove
 * button lock, because either would otherwise queue a second write against a
 * list that is about to change.
 */
export const Saving: Story = {
  args: { saving: true },
};
