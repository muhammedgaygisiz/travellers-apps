import {
  applicationConfig,
  argsToTemplate,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import {
  ImageUpload2Component,
  IMAGE_UPLOAD_FN,
} from '../image-upload2.component';

addNecessaryIcons();

const mockUploadFn = (_base64: string): Promise<string> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
      );
    }, 1500);
  });

const mockSlowUploadFn = (_base64: string): Promise<string> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
      );
    }, 5000);
  });

const mockFailingUploadFn = (_base64: string): Promise<string> =>
  new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Upload failed'));
    }, 1000);
  });

export default {
  title: 'Components/ImageUpload2',
  component: ImageUpload2Component,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: IMAGE_UPLOAD_FN, useValue: mockUploadFn },
      ],
    }),
  ],
  render: (args) => ({
    props: { ...args },
    template: `
      <div class="ion-padding">
        <image-upload2 ${argsToTemplate(args)} />
      </div>
    `,
  }),
} as Meta<ImageUpload2Component>;

type Story = StoryObj<ImageUpload2Component>;

export const Empty: Story = {
  args: {},
};

export const WithImageUrl: Story = {
  args: {
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
  },
};

export const SlowUpload: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: IMAGE_UPLOAD_FN, useValue: mockSlowUploadFn },
      ],
    }),
  ],
  args: {},
};

export const FailingUpload: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: IMAGE_UPLOAD_FN, useValue: mockFailingUploadFn },
      ],
    }),
  ],
  args: {},
};
