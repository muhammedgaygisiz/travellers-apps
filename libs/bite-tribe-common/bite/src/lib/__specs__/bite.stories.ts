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
      <bt-bite [bite]="bite()" />
      <ion-button expand="block" (click)="completeUpload()">
        Complete upload
      </ion-button>
    </div>
  `,
})
class BiteUploadDemoComponent {
  readonly bite = signal<BiteModel>({
    ...demoBiteBase,
    image: '',
    imagePath: undefined,
    imageStatus: 'pending',
  });

  completeUpload(): void {
    this.bite.set({
      ...demoBiteBase,
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

export const PendingUpload: Story = {
  args: {
    ...Bite.args,
    bite: {
      ...demoBiteBase,
      imagePath: undefined,
      image: '',
      imageStatus: 'pending',
    },
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
