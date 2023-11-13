import { HeaderComponent } from '../header.component';

export default {
  title: 'Kosaml/Layout/Header',
  component: HeaderComponent,
};

export const UnauthorizedHeader = () => ({
  component: HeaderComponent,
});

export const AuthorizedHeader = () => ({
  component: HeaderComponent,
  props: {
    isAuthenticated: true,
  },
});
