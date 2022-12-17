import { moduleMetadata } from '@storybook/angular';
import { HeaderComponent } from '../header.component';
import { SiteModule } from '../../../site.module';

export default {
  title: 'Kosaml/Layout/Header',
  decorators: [
    moduleMetadata({
      imports: [SiteModule],
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
