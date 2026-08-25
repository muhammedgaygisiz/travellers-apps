import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BiteTribeHomeComponent } from '../home.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/Home',
  component: BiteTribeHomeComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BiteTribeHomeComponent>;

type Story = StoryObj<BiteTribeHomeComponent>;
export const Empty: Story = {
  args: {
    isAuthenticated: true,
    allTags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
  },
};

export const WithBites: Story = {
  args: {
    ...Empty.args,
    bites: [
      {
        id: 'bite1',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
    ],
  },
};

/**
 * The feed at desktop widths: two columns from 1024px and three from 1280px,
 * inside a content column that widens past the phone column. Narrow the
 * viewport below 1024px and the same feed falls back to the single column it
 * has always had — the layout is driven by media queries, not by state.
 *
 * Enough Bites to fill more than one row, with titles of different lengths so
 * the row alignment is visible. See GitHub issue #1250.
 */
export const DesktopFeed: Story = {
  args: {
    ...Empty.args,
    bites: [
      'Botanic Breeze',
      'Beef Krapao with a runny fried egg',
      'Boiled beef',
      'Som tam',
      'Mango sticky rice with coconut cream',
      'Massaman curry',
    ].map(
      (name, index) =>
        ({
          id: `bite${index + 1}`,
          name,
          imagePath: 'assets/demo/bite-demo.png',
          place: 'Einstein au Jardin',
          distance: `${index + 1}.4`,
          rating: (index % 5) + 1,
          thumbup: index % 3,
        }) as Bite,
    ),
  },
};

export const Loading: Story = {
  args: {
    ...Empty.args,
    showSpinner: true,
    isBitesLoading: true,
  },
};

/** The account still has to verify its email, so the resend offer is idle. */
export const EmailVerificationPrompt: Story = {
  args: {
    ...Empty.args,
    showEmailVerificationPrompt: true,
  },
};

/** The resend callable is in flight: progress is shown and the tap is blocked. */
export const EmailVerificationResendRunning: Story = {
  args: {
    ...Empty.args,
    showEmailVerificationPrompt: true,
    emailVerificationResendRunning: true,
  },
};
