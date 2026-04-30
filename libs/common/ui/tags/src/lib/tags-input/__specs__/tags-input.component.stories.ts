import { TagsInputComponent } from '../tags-input.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircle } from 'ionicons/icons';

export default {
  title: 'Components/Tags',
  component: TagsInputComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
      ],
    }),
  ],
} as Meta<TagsInputComponent>;

type Story = StoryObj<TagsInputComponent>;

addIcons({
  closeCircle,
});

export const Primary: Story = {
  args: {
    readonly: false,
    tags: ['Burger', 'Fries', 'Heart failure'],
  },
};

export const Readonly: Story = {
  args: {
    ...Primary.args,
    readonly: true,
  },
};

export const Empty: Story = {
  args: {
    ...Primary.args,
    tags: [],
  },
};
