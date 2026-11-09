import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, closeCircle } from 'ionicons/icons';
import { getIonicConfig } from 'utils';
import type { PublicUser } from 'model';
import {
  AteWithPickerComponent,
  MAX_TAGGED_USERS,
} from '../ate-with-picker.component';

addIcons({ addCircleOutline, closeCircle });

const person = (userId: string, displayName: string): PublicUser => ({
  userId,
  displayName,
  email: '',
  photoUrl: '',
  public: true,
});

const FOLLOWING = [
  person('anna', 'Anna'),
  person('ben', 'Ben'),
  person('chiara', 'Chiara'),
  person('dev', 'Dev'),
  person('emre', 'Emre'),
  person('fatima', 'Fatima'),
  person('goran', 'Goran'),
  person('hana', 'Hana'),
  person('ines', 'Ines'),
  person('jun', 'Jun'),
  person('kofi', 'Kofi'),
];

export default {
  title: 'Components/Ate With Picker',
  component: AteWithPickerComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<AteWithPickerComponent>;

type Story = StoryObj<AteWithPickerComponent>;

/** Nobody picked yet: the first few accounts the creator follows are offered. */
export const Empty: Story = {
  args: {
    candidates: FOLLOWING,
    selectedIds: [],
  },
};

export const Filled: Story = {
  args: {
    candidates: FOLLOWING,
    selectedIds: ['anna', 'dev'],
  },
};

/** Ten picked: adding is closed and the field says why. */
export const AtLimit: Story = {
  args: {
    candidates: FOLLOWING,
    selectedIds: FOLLOWING.slice(0, MAX_TAGGED_USERS).map(
      (user) => user.userId,
    ),
  },
};

/** The creator follows nobody they could tag. */
export const NoCandidates: Story = {
  args: {
    candidates: [],
    selectedIds: [],
  },
};
