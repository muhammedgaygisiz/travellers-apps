import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideHttpClient } from '@angular/common/http';
import { TagsComponent } from '../tags.component';

const meta: Meta<TagsComponent> = {
  title: 'Components/Tags',
  component: TagsComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient()],
    }),
  ],
};
export default meta;
type Story = StoryObj<TagsComponent>;

const tags = ['pizza', 'burger', 'tandoori'];

export const Preselection: Story = {
  args: {
    tags,
  },
};

export const Empty: Story = {
  args: {
    tags: [],
  },
};
