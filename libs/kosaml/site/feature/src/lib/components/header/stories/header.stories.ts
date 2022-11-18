import { moduleMetadata } from '@storybook/angular';
import { SharedModule } from 'src/app/shared';
import { HeaderComponent } from '../header.component';

export default {
  title: 'Header',
  decorators: [
    moduleMetadata({
      imports: [SharedModule],
    }),
  ],
};

export const unauthorizedHeader = () => ({
  component: HeaderComponent,
});

export const authorizedHeader = () => ({
  component: HeaderComponent,
  props: {
    isAuthenticated: true,
  },
});
