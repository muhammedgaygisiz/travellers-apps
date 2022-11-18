import { moduleMetadata } from '@storybook/angular';
import { SharedModule } from 'src/app/shared';
import { MenuBarComponent } from '../menu-bar.component';

export default {
  title: 'Menu Bar',
  decorators: [
    moduleMetadata({
      imports: [SharedModule],
    }),
  ],
};

export const menubar = () => ({
  component: MenuBarComponent,
});
