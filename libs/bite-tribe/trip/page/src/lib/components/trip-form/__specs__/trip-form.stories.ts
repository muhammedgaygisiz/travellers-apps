import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import type { Trip } from 'model';
import { TripFormComponent } from '../trip-form.component';

export default {
  title: 'Components/Trip Form',
  component: TripFormComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<TripFormComponent>;

type Story = StoryObj<TripFormComponent>;

const TRIP: Trip = {
  id: 'ongoing',
  userId: 'user-1',
  title: 'Southeast Asia 2026/2027',
  startDate: '2026-11-01',
  endDate: '2027-01-15',
};

export const NewTrip: Story = {};

export const EditTrip: Story = {
  args: { trip: TRIP },
};

/** Saving an untitled trip names the reason instead of closing. */
export const RefusedWithoutTitle: Story = {
  play: async ({ canvasElement }) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    canvasElement
      .querySelector<HTMLElement>('[data-testid="trip-form-save"]')
      ?.click();
  },
};
