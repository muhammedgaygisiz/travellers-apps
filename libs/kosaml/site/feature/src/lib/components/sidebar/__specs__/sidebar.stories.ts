import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { moduleMetadata } from '@storybook/angular';
import { SidebarComponent } from '../sidebar.component';
import { SiteModule } from '../../../site.module';

export default {
  title: 'Kosaml/Layout/Sidebar',
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, RouterTestingModule, SiteModule],
    }),
  ],
};

export const emptySidebar = () => ({
  component: SidebarComponent,
  props: {
    project: [
      {
        children: [
          {
            name: 'Folder',
            type: 'file',
          },
        ],
        name: 'File',
        type: 'folder',
      },
    ],
    isProjectBarOpen: true,
    marginTop: 0,
    width: 250,
  },
});
