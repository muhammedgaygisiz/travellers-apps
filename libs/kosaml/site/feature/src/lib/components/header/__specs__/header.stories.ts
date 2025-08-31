import { HeaderComponent } from '../header.component';

export default {
  title: 'Kosaml/Layout/Header',
  component: HeaderComponent,
};

export const UnauthorizedHeader = (): any => ({
  component: HeaderComponent,
});

export const AuthorizedHeader = (): any => ({
  component: HeaderComponent,
  props: {
    isAuthenticated: true,
  },
});
