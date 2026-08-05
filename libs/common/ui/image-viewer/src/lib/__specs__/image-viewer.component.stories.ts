import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import {
  ImageViewerComponent,
  ImageViewerImage,
} from '../image-viewer.component';

const MockTranslocoService = {
  translate: (key: string): string => key,
  config: {
    reRenderOnLangChange: (): boolean => true,
  },
  langChanges$: of(),
};

addNecessaryIcons();

const PHOTOS: ImageViewerImage[] = [
  { src: '/assets/icons/apple-splash-1125-2436.jpg', alt: 'First photo' },
  { src: '/assets/icons/apple-splash-1242-2208.jpg', alt: 'Second photo' },
  { src: '/assets/icons/apple-splash-1536-2048.jpg', alt: 'Third photo' },
];

// The viewer fills its host, which in the app is a full-screen ion-modal.
// Stories give it a fixed box so the captured frame is stable.
const inViewport = (template: string): string =>
  `<div style="height: 480px">${template}</div>`;

export default {
  title: 'Components/Image Viewer',
  component: ImageViewerComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }),
  ],
} as Meta<ImageViewerComponent>;

type Story = StoryObj<ImageViewerComponent>;

export const SinglePhoto: Story = {
  render: () => ({
    props: { images: [PHOTOS[0]] },
    template: inViewport('<image-viewer [images]="images" />'),
  }),
};

export const MultiplePhotos: Story = {
  render: () => ({
    props: { images: PHOTOS },
    template: inViewport('<image-viewer [images]="images" />'),
  }),
};

export const WithBiteAction: Story = {
  render: () => ({
    props: {
      images: [{ ...PHOTOS[0], actionLabel: 'Open Bite' }, PHOTOS[1]],
    },
    template: inViewport('<image-viewer [images]="images" />'),
  }),
};
