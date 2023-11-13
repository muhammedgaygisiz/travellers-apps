import { LoadingSpinnerComponent } from '../loading-spinner.component';
import { moduleMetadata } from "@storybook/angular";
import { NgxSkeletonLoaderModule } from "ngx-skeleton-loader";

export default {
  title: 'Kosaml/Base/Loading Spinner',
  component: LoadingSpinnerComponent,
  decorators: [
    moduleMetadata({
      imports: [
        NgxSkeletonLoaderModule.forRoot({
          animation: false
        })
      ]
    })
  ]
};

export const LoadingSpinner = () => ({
});
