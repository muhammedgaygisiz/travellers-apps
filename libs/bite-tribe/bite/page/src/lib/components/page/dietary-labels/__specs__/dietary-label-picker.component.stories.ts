import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';
import { getIonicConfig } from 'utils';
import { DietaryLabelPickerComponent } from '../dietary-label-picker.component';

addIcons({ checkmarkOutline });

/** The Bite form's dietary label chips (GitHub issue #2195). */
export default {
  title: 'Components/Dietary Label Picker',
  component: DietaryLabelPickerComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<DietaryLabelPickerComponent>;

type Story = StoryObj<DietaryLabelPickerComponent>;

/** Nothing picked: the field is optional. */
export const Empty: Story = {
  args: { selected: [] },
};

/** Lifestyle labels only, so no notice. */
export const Lifestyle: Story = {
  args: { selected: ['vegan', 'alcohol-free'] },
};

/** A high-risk label is picked, and the notice appears under the hint. */
export const HighRisk: Story = {
  args: { selected: ['vegetarian', 'gluten-free'] },
};
