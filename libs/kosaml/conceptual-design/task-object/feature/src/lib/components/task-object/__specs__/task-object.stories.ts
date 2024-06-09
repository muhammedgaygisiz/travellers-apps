import { TaskObjectComponent } from '../task-object.component';
import { Meta, StoryObj } from '@storybook/angular';

export default {
  title: 'Conceptual Design/Task Object',
  component: TaskObjectComponent,
  render: (args) => ({
    props: { ...args },
  }),
} as Meta<TaskObjectComponent>;

type Story = StoryObj<TaskObjectComponent>;

export const TaskObject: Story = {
  args: {
    dataSource: [
      {
        id: '1',
        taskObject: 'CD-ROM',
        attributes: [
          'Keywords',
          'Title',
          'Author',
          'Year',
          'Platform',
          'Owned by (academic, researcher, or research student)',
        ],
        actions: ['View', 'Add', 'Print', 'Delete', 'Save', 'Reserve', 'Edit'],
      },
    ],
  },
};
