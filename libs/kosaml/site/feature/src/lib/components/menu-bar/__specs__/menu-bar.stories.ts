import { applicationConfig } from '@storybook/angular';
import { MenuBarComponent } from '../menu-bar.component';
import { provideAnimations } from '@angular/platform-browser/animations';

export default {
  title: 'Kosaml/Layout/Menu Bar',
  component: MenuBarComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
};

export const Menubar = () => ({
  component: MenuBarComponent,
});
