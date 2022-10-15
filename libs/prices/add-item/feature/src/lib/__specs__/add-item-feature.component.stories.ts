import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { AddItemComponent } from '../components/add-item.component';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

export default {
  title: 'Pages/Add Item',
  decorators: [
    moduleMetadata({
      imports: [
        IonicModule.forRoot(getIonicConfig()),
        AddItemComponent,
        RouterTestingModule,
      ],
    }),
  ],
} as Meta<AddItemComponent>;

const Template: Story<AddItemComponent> = (args: AddItemComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {
  location: 'Bern',
};
