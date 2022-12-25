import { TaskObjectComponent } from '../task-object.component';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { TaskObjectModule } from '../../../task-object.module';

export default {
  title: 'Conceptual Design/Task Object',
  component: TaskObjectComponent,
  decorators: [
    moduleMetadata({
      imports: [TaskObjectModule],
    }),
  ],
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
