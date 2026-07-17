import { Component, signal } from '@angular/core';
import { BiteComponent } from '../bite.component';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { getIonicConfig } from 'utils';
import { IonButton, provideIonicAngular } from '@ionic/angular/standalone';
import { BiteSkeletonListComponent } from '../bite-skeleton-list/bite-skeleton-list.component';
import { Bite as BiteModel } from 'model';

const PEACH_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg';

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
