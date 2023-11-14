import { provideAnimations } from '@angular/platform-browser/animations';
import { applicationConfig } from '@storybook/angular';
import { SidebarComponent } from '../sidebar.component';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';

export default {
  title: 'Kosaml/Layout/Sidebar',
  component: SidebarComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideAnimations(),
        provideLocationMocks(),
        provideRouter([]),
      ],
    }),
  ],
};

export const EmptySidebar = () => ({
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
