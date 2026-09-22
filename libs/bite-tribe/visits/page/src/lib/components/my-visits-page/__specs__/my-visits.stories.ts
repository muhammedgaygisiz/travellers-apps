import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { VisitSummary } from 'model';
import { MyVisitsPage } from '../my-visits.page';

addNecessaryIcons();

/**
 * Every meal this account keeps (GitHub issue #1111).
 *
 * The page takes everything as an input and calls nothing, so the stories are
 * the four states rather than four fakes: loading, empty, failed, and a list.
 *
 * **The empty one is the state that matters most today.** Table ordering needs
 * a restaurant with a floor plan, printed codes and a published menu, so for
 * almost every account there is nothing here and will not be for a while - and
 * an empty screen that says nothing reads as a screen that broke. The picture
 * is the check on that.
 */
const meal = (
  id: string,
  restaurantName: string,
  closedAt: string,
  total: number,
): VisitSummary => ({
  id,
  restaurantId: 'r1',
  restaurantName,
  tableLabel: '12',
  closedAt: Date.parse(closedAt),
  currency: 'EUR',
  lines: [],
  total,
  paymentStatus: 'settled',
});

export default {
  title: 'Pages/My Visits',
  component: MyVisitsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<MyVisitsPage>;

type Story = StoryObj<MyVisitsPage>;

/** The list, newest first, as the backend returns it. */
export const WithVisits: Story = {
  args: {
    summaries: [
      meal('visit-3', 'Sakura Kitchen', '2026-09-16T18:00:00Z', 31),
      meal('visit-2', 'China Wok', '2026-08-30T12:30:00Z', 18.5),
      meal('visit-1', 'Trattoria da Enzo', '2026-07-02T20:15:00Z', 64),
    ],
  },
};

/**
 * The ordinary state, and the reason the menu entry that leads here is
 * deliberately not added yet.
 */
export const Empty: Story = { args: { empty: true } };

/** Waiting on the call, where saying "nothing here" would be a lie. */
export const Loading: Story = { args: { loading: true } };

/** The call did not land, which is a different thing from having no meals. */
export const Failed: Story = { args: { failed: true } };
