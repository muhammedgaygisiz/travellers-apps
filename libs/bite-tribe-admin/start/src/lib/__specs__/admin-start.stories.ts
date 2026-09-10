import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { AdminStart } from '../admin-start';

addNecessaryIcons();

export default {
  title: 'Admin/Start',
  component: AdminStart,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig()), provideRouter([])],
    }),
  ],
} as Meta<AdminStart>;

type Story = StoryObj<AdminStart>;

/**
 * The signed-out landing page. It mirrors the business app's - same logo, same
 * grid - with one deliberate difference: no Sign Up, because operator access is
 * granted rather than self-served.
 */
export const Default: Story = {};
