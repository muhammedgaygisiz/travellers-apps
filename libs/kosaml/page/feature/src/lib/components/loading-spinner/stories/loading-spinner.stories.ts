import { moduleMetadata } from '@storybook/angular';
import { LoadingSpinnerComponent } from '../..';
import { SharedModule } from '../../..';

export default {
  title: 'Loading Spinner',
  decorators: [
    moduleMetadata({
      imports: [SharedModule],
    }),
  ],
};

export const loadingSpinner = () => ({
  component: LoadingSpinnerComponent,
});
