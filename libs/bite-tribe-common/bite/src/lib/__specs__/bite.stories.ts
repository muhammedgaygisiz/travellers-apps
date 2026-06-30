import { BiteComponent } from '../bite.component';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { BiteSkeletonListComponent } from '../bite-skeleton-list/bite-skeleton-list.component';

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
    bite: {
      name: 'Peaches',
      imagePath:
        'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
      distance: '30.7',
      place: "Sam's",
      rating: 4,
      likes: [
        {
          likeType: 'thumbup',
        },
      ],
    } as any,
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
      ...Bite.args?.bite,
    } as any,
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
      ...Bite.args?.bite,
      rating: 0,
    } as any,
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
      ...Bite.args?.bite,
      rating: 0,
      userId: '1',
    } as any,
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
      ...Bite.args?.bite,
      rating: 0,
      userId: '1',
    } as any,
    userId: '1',
    showEditButton: true,
  },
  render: (args) => ({
    props: { ...args },
    template,
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
