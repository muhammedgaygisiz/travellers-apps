import { TaskObjectComponent } from '../task-object.component';
import { Meta, Story } from '@storybook/angular';

export default {
  title: 'Conceptual Design/Task Object',
  component: TaskObjectComponent,
} as Meta<TaskObjectComponent>;

const Template: Story<TaskObjectComponent> = (args: TaskObjectComponent) => ({
  props: args,
});

export const TaskObject = Template.bind({});
TaskObject.args = {
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
};
