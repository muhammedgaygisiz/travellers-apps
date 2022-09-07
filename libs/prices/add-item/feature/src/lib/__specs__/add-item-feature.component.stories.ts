import {Meta, moduleMetadata, Story} from "@storybook/angular";
import {AddItemComponent} from "../add-item.component";

export default {
  title: 'Pages/Add Item',
  component: AddItemComponent,
  decorators: [
    moduleMetadata({

    })
  ]
} as Meta<AddItemComponent>;

const Template: Story<AddItemComponent> = (args: AddItemComponent) => ({
  props: args
});

export const Primary = Template.bind({});
Primary.args = {};
