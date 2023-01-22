import { HeaderComponent } from '../header.component';

export default {
  title: 'Kosaml/Layout/Header',
  component: HeaderComponent,
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
