import { Directive, inject } from '@angular/core';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { TranslocoService } from '@jsverse/transloco';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ImageUploadComponent } from '../image-upload.component';

@Directive({
  selector: 'image-upload[storybookLoading]',
})
class StorybookLoadingDirective {
  constructor() {
    inject(ImageUploadComponent).isLoading.set(true);
  }
}

@Directive({
  selector: 'image-upload[storybookPending]',
})
class StorybookPendingDirective {
  constructor() {
    // Freezes the component between the img being inserted and its load event.
    // That window is real but too short to reach by hand, so neutralise the
    // load handler to hold the state for review.
    inject(ImageUploadComponent).onImageLoad = (): void => undefined;
  }
}

@Directive({
  selector: 'image-upload[storybookDisabled]',
})
class StorybookDisabledDirective {
  constructor() {
    inject(ImageUploadComponent).setDisabledState(true);
  }
}

@Directive({
  selector: 'image-upload[storybookDragging]',
})
class StorybookDraggingDirective {
  constructor() {
    inject(ImageUploadComponent).isDragging.set(true);
  }
}

const MockTranslocoService = {
  translate: (key: string): string => key,
  config: {
    reRenderOnLangChange: (): boolean => true,
  },
  langChanges$: of(),
};

addNecessaryIcons();

export default {
  title: 'Components/Image Upload',
  component: ImageUploadComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }),
  ],
} as Meta<ImageUploadComponent>;

type Story = StoryObj<ImageUploadComponent>;

export const Empty: Story = {};

export const Disabled: Story = {
  decorators: [
    moduleMetadata({
      imports: [ImageUploadComponent, StorybookDisabledDirective],
    }),
  ],
  render: () => ({
    template: '<image-upload storybookDisabled />',
  }),
};

export const Dragging: Story = {
  decorators: [
    moduleMetadata({
      imports: [ImageUploadComponent, StorybookDraggingDirective],
    }),
  ],
  render: () => ({
    template: '<image-upload storybookDragging />',
  }),
};

export const WithImage: Story = {
  args: {
    imageUrl: '/assets/icons/apple-splash-2736-1260.jpg',
  },
};

export const Loading: Story = {
  decorators: [
    moduleMetadata({
      imports: [ImageUploadComponent, StorybookLoadingDirective],
    }),
  ],
  render: () => ({
    template: '<image-upload storybookLoading />',
  }),
};

// The chosen image is in the DOM but has not decoded yet, so the skeleton still
// covers the box. Without it the box would collapse to empty space here.
export const Pending: Story = {
  decorators: [
    moduleMetadata({
      imports: [ImageUploadComponent, StorybookPendingDirective],
    }),
  ],
  render: () => ({
    template:
      '<image-upload storybookPending imageUrl="/assets/icons/apple-splash-2736-1260.jpg" />',
  }),
};
