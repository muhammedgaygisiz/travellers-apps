import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DaySchedule, Restaurant } from 'model';
import { EditRestaurantComponent } from '../edit-restaurant.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const RESTAURANT_IMAGE = 'assets/demo/bite-demo.png';

const openingHours: DaySchedule[] = [
  { day: 'monday', isOpen: false, timeRanges: [] },
  {
    day: 'tuesday',
    isOpen: true,
    timeRanges: [{ from: '12:00', to: '15:00' }],
  },
  {
    day: 'wednesday',
    isOpen: true,
    timeRanges: [{ from: '12:00', to: '15:00' }],
  },
  {
    day: 'thursday',
    isOpen: true,
    timeRanges: [
      { from: '12:00', to: '15:00' },
      { from: '18:00', to: '23:00' },
    ],
  },
  {
    day: 'friday',
    isOpen: true,
    timeRanges: [{ from: '18:00', to: '23:30' }],
  },
  {
    day: 'saturday',
    isOpen: true,
    timeRanges: [{ from: '18:00', to: '23:30' }],
  },
  { day: 'sunday', isOpen: false, timeRanges: [] },
];

const trattoria: Restaurant = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  description: 'Cosy family-run Italian restaurant, wood-fired since 1974.',
  imagePath: RESTAURANT_IMAGE,
  position: { latitude: 40.8518, longitude: 14.2681 },
  address: {
    street: 'Via Roma 1',
    postcode: '80100',
    city: 'Napoli',
    country: 'Italy',
  },
  menuId: 'menu-trattoria',
  categories: ['restaurant', 'fine-dining'],
  openingHours,
  socialMediaLinks: [
    { network: 'instagram', url: 'https://instagram.com/trattoria-roma' },
    { network: 'facebook', url: 'https://facebook.com/trattoria-roma' },
  ],
} as Restaurant;

export default {
  title: 'Business/Edit Restaurant',
  component: EditRestaurantComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { restaurant: trattoria },
} as Meta<EditRestaurantComponent>;

type Story = StoryObj<EditRestaurantComponent>;

/**
 * One section at a time (GitHub issue #2183). `Default` is the About text of
 * a restaurant with everything filled in; the stories below each open one
 * other section of it.
 */
export const Default: Story = { args: { section: 'about' } };

export const Photo: Story = { args: { section: 'photo' } };

export const KindOfPlace: Story = { args: { section: 'categories' } };

export const Links: Story = { args: { section: 'links' } };

export const Address: Story = { args: { section: 'address' } };

/** Opening hours across two service windows and two closed days. */
export const OpeningHours: Story = { args: { section: 'opening-hours' } };

/**
 * The opening hours on a phone (GitHub issue #2234): one line per day and
 * each range full width under it, so both times and the remove button are on
 * screen. The header shows the whole name at this width too (#2233).
 *
 * Business stories are baselined at `chrome.laptop` only (#1547); these two
 * set the phone's size themselves, which a story's `loki` parameters can do
 * within that configuration.
 */
export const OpeningHoursPhone: Story = {
  args: { section: 'opening-hours' },
  parameters: { loki: { width: 375, height: 812 } },
};

/** The narrowest phone a restaurant owner is likely to hold. */
export const OpeningHoursNarrowPhone: Story = {
  args: { section: 'opening-hours' },
  parameters: { loki: { width: 320, height: 640 } },
};

export const Facilities: Story = { args: { section: 'facilities' } };

export const TableOrdering: Story = { args: { section: 'table-ordering' } };

export const MenuCode: Story = { args: { section: 'menu-code' } };

/**
 * What Print code puts on paper (GitHub issue #2230): the code, the
 * restaurant's name and nothing of the page around it. Captured in print
 * media, so a change that blanks the printout fails the visual suite; it
 * printed one empty page once the code moved into its own section view.
 */
export const MenuCodePrinted: Story = {
  args: { section: 'menu-code' },
  parameters: { loki: { media: 'print' } },
};

/**
 * The links of a restaurant an operator has just handed over: there are none
 * yet, so the section shows its empty state.
 */
export const Empty: Story = {
  args: {
    section: 'links',
    restaurant: {
      id: 'restaurant-new',
      name: 'Osteria Vecchia',
      position: { latitude: 40.8395, longitude: 14.2529 },
    } as Restaurant,
  },
};

/** The menu code of a restaurant whose menu exists but nothing else does. */
export const WithMenuOnly: Story = {
  args: {
    section: 'menu-code',
    restaurant: {
      id: 'restaurant-new',
      name: 'Osteria Vecchia',
      position: { latitude: 40.8395, longitude: 14.2529 },
      menuId: 'menu-osteria',
    } as Restaurant,
  },
};

/**
 * A new photo is uploading in the background (GitHub issue #2126). The new
 * photo shows blurred under a spinner while it is sent, the way a profile
 * photo does (#1953).
 */
export const PhotoUploading: Story = {
  args: {
    section: 'photo',
    photoStatus: 'pending',
    pendingPhoto: RESTAURANT_IMAGE,
  },
};

/**
 * The upload failed and this session still holds the photo, so it offers the
 * shared retry button (GitHub issue #2126).
 */
export const PhotoFailed: Story = {
  args: {
    section: 'photo',
    photoStatus: 'failed',
    canRetryPhoto: true,
  },
};

/**
 * An upload from an earlier session failed. The business app runs on the web
 * and keeps no copy on the device, so it asks for the photo again (GitHub
 * issue #2126).
 */
export const PhotoFailedInAnEarlierSession: Story = {
  args: {
    section: 'photo',
    photoStatus: 'failed',
    canRetryPhoto: false,
  },
};

/**
 * The transfer is done and the image check has not answered yet (GitHub
 * issue #2141): the new photo stays blurred, and the box says it is being
 * checked rather than uploaded.
 */
export const PhotoChecking: Story = {
  args: {
    section: 'photo',
    photoStatus: 'pending',
    pendingPhoto: RESTAURANT_IMAGE,
    photoChecking: true,
  },
};

/**
 * The image check refused the new photo (GitHub issue #2141). The restaurant
 * keeps its previous photo, the reason is said below the box, and a different
 * photo can be chosen at once.
 */
export const PhotoRefused: Story = {
  args: {
    section: 'photo',
    photoStatus: 'refused',
    photoRefusalCategory: 'violence',
  },
};

/**
 * The check of stored photos refused the photo the restaurant showed (GitHub
 * issue #2143). It was taken down with `imagePath`, so the restaurant has no
 * photo until a different one is chosen, and the line below the box says so.
 */
export const StoredPhotoRefused: Story = {
  args: {
    section: 'photo',
    restaurant: { ...trattoria, imagePath: undefined },
    photoStatus: 'refused',
    photoRefusalCategory: 'violence',
  },
};
