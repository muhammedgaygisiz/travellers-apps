import { Component, signal } from '@angular/core';
import { BiteComponent } from '../bite.component';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { IonButton, provideIonicAngular } from '@ionic/angular/standalone';
import { BiteSkeletonListComponent } from '../bite-skeleton-list/bite-skeleton-list.component';
import { Bite as BiteModel } from 'model';

// The app registers its icon set at bootstrap; Storybook has to do it itself or
// ion-icon renders an empty box (e.g. the failed-upload state).
addNecessaryIcons();

// Local, bundled demo image served from the Storybook static build's /assets
// dir. Visual-regression references must not depend on live third-party images
// (Wikimedia, Firebase Storage, ...), which load nondeterministically inside the
// Loki docker Chrome and otherwise leave the card photo blank on a failed fetch.
const PEACH_IMAGE = 'assets/demo/bite-demo.png';

const OWNER_ID = '1';

const demoBiteBase: BiteModel = {
  id: 'bite1',
  name: 'Peaches',
  image: '',
  imagePath: PEACH_IMAGE,
  distance: '30.7',
  place: "Sam's",
  price: 0,
  position: { latitude: 46.948, longitude: 7.4474 },
  rating: 4,
  thumbup: 1,
  city: 'Bern',
  countryCode: 'CH',
};

@Component({
  selector: 'bt-bite-upload-demo',
  imports: [BiteComponent, IonButton],
  template: `
    <div class="ion-margin">
      <bt-bite [bite]="bite()" [userId]="OWNER_ID" />
      <ion-button expand="block" (click)="completeUpload()">
        Complete upload
      </ion-button>
    </div>
  `,
})
class BiteUploadDemoComponent {
  // The demo walks through the poster's own upload, so the card is viewed as
  // its owner and shows the "keep the app open" message.
  readonly OWNER_ID = OWNER_ID;

  readonly bite = signal<BiteModel>({
    ...demoBiteBase,
    userId: OWNER_ID,
    image: '',
    imagePath: undefined,
    imageStatus: 'pending',
  });

  completeUpload(): void {
    this.bite.set({
      ...demoBiteBase,
      userId: OWNER_ID,
      image: '',
      imagePath: PEACH_IMAGE,
      imageStatus: 'uploaded',
    });
  }
}

export default {
  title: 'Components/Bite',
  component: BiteComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [BiteSkeletonListComponent],
    }),
  ],
} as Meta<BiteComponent>;

type Story = StoryObj<BiteComponent>;

const template = `
  <div class="ion-margin">
    <bt-bite
      [bite]="bite"
      [showEditButton]="showEditButton"
      [userId]="userId"
      [enableImageRetry]="enableImageRetry"
    />
  </div>
`;
export const Bite: Story = {
  args: {
    bite: demoBiteBase,
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const LikedByMe: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      thumbup: 2,
      drooling: 1,
      likes: [
        {
          userId: '1',
          likeType: 'thumbup',
          createdAt: '2026-01-01T00:00:00.000Z',
          biteId: demoBiteBase.id,
        },
      ],
    },
    userId: '1',
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

// The like aggregates on the Bite document are written by a Firestore trigger,
// so they can still be missing right after an own reaction or on an old Bite
// that was never migrated. The counter must show the own reaction anyway
// instead of falling back to the empty chip (issue #1165).
export const LikedByMeWithLaggingAggregate: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      thumbup: undefined,
      likes: [
        {
          userId: '1',
          likeType: 'thumbup',
          createdAt: '2026-01-01T00:00:00.000Z',
          biteId: demoBiteBase.id,
        },
      ],
    },
    userId: '1',
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * A long place name next to a long city/country. Both columns keep their own
 * share of the row and start at the top instead of colliding. See GitHub issue
 * #1172.
 */
export const LongPlaceAndLocation: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      name: 'Sorrentino de Cordero con Caprese',
      place: 'Bungalows Venite a Casa',
      distance: '9562',
      city: 'Villa Serrana',
      countryCode: 'UY',
    },
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const EditMode: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
    },
    showEditButton: true,
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * The viewer's own Bite in a feed. The likes chip is shown flat and read-only
 * next to the card corner instead of being hidden. See GitHub issue #1401.
 */
export const OwnBiteWithReadOnlyLikes: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      userId: OWNER_ID,
      thumbup: 2,
      drooling: 1,
    },
    userId: OWNER_ID,
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const NoRating: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      rating: 0,
    },
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const QuickRating: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      rating: 0,
      userId: '1',
    },
    userId: '1',
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const QuickRatingForEditMode: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      rating: 0,
      userId: '1',
    },
    userId: '1',
    showEditButton: true,
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * The poster's own upload. Only their device is transferring the photo, so only
 * they are asked to keep the app open.
 */
export const PendingUpload: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      imagePath: undefined,
      image: '',
      imageStatus: 'pending',
      userId: '1',
    },
    userId: '1',
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * The same Bite seen by anyone else. They cannot influence someone else's
 * upload, so they get a neutral wait message. See GitHub issue #1168.
 */
export const PendingUploadForViewer: Story = {
  args: {
    ...PendingUpload.args,
    bite: {
      ...demoBiteBase,
      imagePath: undefined,
      image: '',
      imageStatus: 'pending',
      userId: 'someone-else',
    },
    userId: '1',
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * The terminal state of an upload that never finished. Without it the card
 * stays on PendingUpload forever — for every viewer, not only the poster.
 * See GitHub issue #1168.
 */
export const FailedUpload: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      imagePath: undefined,
      image: '',
      imageStatus: 'failed',
    },
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * The same failure seen by the poster, who is offered a retry. The photo lives
 * on their device, so nobody else is shown the button.
 */
export const FailedUploadForOwner: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      imagePath: undefined,
      image: '',
      imageStatus: 'failed',
      userId: OWNER_ID,
    },
    userId: OWNER_ID,
    enableImageRetry: true,
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const UploadedState: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      imageStatus: 'uploaded',
    },
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

/**
 * A Bite that has lost its photo. Nothing reports a transfer, so neither the
 * upload placeholder nor an image is rendered and the photo box stays empty.
 * That leaves the card's own corners carrying the shape on their own, which is
 * where the square photo-box border used to show through the rounded card.
 * See GitHub issue #1251.
 */
export const MissingPhoto: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      image: '',
      imagePath: undefined,
    },
  },
  render: (args) => ({
    props: { ...args },
    template,
  }),
};

export const PendingToUploaded: Story = {
  render: () => ({
    moduleMetadata: { imports: [BiteUploadDemoComponent] },
    template: `<bt-bite-upload-demo />`,
  }),
};

export const LoadingSkeletonList: Story = {
  render: () => ({
    template: `
      <div class="ion-margin">
        <bt-bite-skeleton-list />
      </div>
    `,
  }),
};

/**
 * A caller that lays the skeletons out in a grid fits more of them per screen
 * than a single column does, so it can ask for a higher desktop count. The feed
 * asks for six, which fills two rows of its three-column grid.
 *
 * All six are in the DOM at every width and the extras are hidden below the
 * desktop breakpoint, so narrowing the viewport drops this back to three
 * without any resize handling. See GitHub issue #1250.
 */
export const LoadingSkeletonListForDesktop: Story = {
  render: () => ({
    template: `
      <div class="ion-margin">
        <bt-bite-skeleton-list [desktopCount]="6" />
      </div>
    `,
  }),
};
