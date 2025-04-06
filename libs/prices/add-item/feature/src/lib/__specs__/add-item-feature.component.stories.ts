import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { AddItemComponent } from '../components/add-item.component';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideLocalization } from 'localization';
import { provideHttpClient } from '@angular/common/http';

addNecessaryIcons();

const meta: Meta<AddItemComponent> = {
  title: 'Pages/Add Item',
  component: AddItemComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideAnimations(),
        provideIonicAngular(getIonicConfig()),
        provideLocalization(),
        provideHttpClient(),
      ],
    }),
  ],
} as Meta<AddItemComponent>;

export default meta;
type Story = StoryObj<AddItemComponent>;

export const Primary: Story = {
  args: {
    location: 'Bern',
  },
};
