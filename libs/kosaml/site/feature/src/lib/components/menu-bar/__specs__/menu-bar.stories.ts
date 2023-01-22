import { moduleMetadata } from '@storybook/angular';
import { MenuBarComponent } from '../menu-bar.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

export default {
  title: 'Kosaml/Layout/Menu Bar',
  component: MenuBarComponent,
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, RouterTestingModule],
    }),
  ],
};

export const menubar = () => ({
  component: MenuBarComponent,
});
