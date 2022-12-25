import { moduleMetadata } from '@storybook/angular';
import { MenuBarComponent } from '../menu-bar.component';
import { SiteModule } from '../../../site.module';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

export default {
  title: 'Kosaml/Layout/Menu Bar',
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, RouterTestingModule, SiteModule],
    }),
  ],
};

export const menubar = () => ({
  component: MenuBarComponent,
});
