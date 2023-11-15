import { LoadingSpinnerComponent } from '../loading-spinner.component';
import { applicationConfig } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { importProvidersFrom } from '@angular/core';

export default {
  title: 'Kosaml/Base/Loading Spinner',
  component: LoadingSpinnerComponent,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom([
          NgxSkeletonLoaderModule.forRoot({
            animation: false,
          }),
        ]),
      ],
    }),
  ],
};

export const LoadingSpinner = () => ({});
