import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Bite, PublicUser } from 'model';
import { CreateBiteTrailComponent } from '../create-bite-trail.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const BITE_IMAGE = 'assets/demo/bite-demo.png';
const AVATAR_IMAGE = 'assets/demo/avatar-demo.png';

const bite = (
  id: string,
  name: string,
  place: string,
  price: number,
): Bite => ({
  id,
  name,
  place,
  price,
  currency: 'EUR',
  image: '',
  imagePath: BITE_IMAGE,
  position: { latitude: 40.8518, longitude: 14.2681 },
  rating: 5,
});

const bites: Bite[] = [
  bite('bite-margherita', 'Margherita al forno', 'Trattoria Roma', 9),
  bite('bite-burrata', 'Burrata pugliese', 'Osteria Vecchia', 11),
  bite(
    'bite-sfogliatella',
    'Sfogliatella riccia',
    'Pasticceria Attanasio',
    2.5,
  ),
];

const owner: PublicUser = {
  userId: 'owner-uid',
  displayName: 'Giulia Bianchi',
  email: 'giulia@trattoria-roma.it',
  photoUrl: AVATAR_IMAGE,
  city: 'Napoli',
};

export default {
  title: 'Business/Create BiteTrail',
  component: CreateBiteTrailComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { bites, owner },
} as Meta<CreateBiteTrailComponent>;

type Story = StoryObj<CreateBiteTrailComponent>;

/**
 * The form as it opens: nothing typed and no Bite picked, so the submit is
 * refused - a BiteTrail with no Bites is not a trail.
 */
export const Default: Story = {};

/**
 * Nothing to pick from. The restaurant has no Bites yet, so the trail cannot be
 * assembled at all and the picker has to say so rather than render an empty
 * list next to an enabled button.
 */
export const WithoutBites: Story = {
  args: { bites: [] },
};
