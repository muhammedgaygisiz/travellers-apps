import { moduleMetadata } from '@storybook/angular';
import { LoadingSpinnerComponent } from '../loading-spinner.component';
import { KosamlPageFeatureModule } from '../../../kosaml-page-feature.module';

export default {
  title: 'Kosaml/Base/Loading Spinner',
  decorators: [
    moduleMetadata({
      imports: [KosamlPageFeatureModule],
    }),
  ],
};

export const loadingSpinner = () => ({
  component: LoadingSpinnerComponent,
});
