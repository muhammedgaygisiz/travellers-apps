import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTreeModule } from '@angular/material/tree';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { StoreModule } from '@ngrx/store';
import { moduleMetadata } from '@storybook/angular';
import { SharedModule } from 'src/app/shared';
import { ProjectComponent } from '../project/project.component';
import { SidebarComponent } from '../sidebar.component';

export default {
  title: 'Sidebar',
  decorators: [
    moduleMetadata({
      declarations: [ProjectComponent],
      imports: [
        BrowserAnimationsModule,
        SharedModule,
        RouterTestingModule,
        MatTreeModule,
        MatSidenavModule,
        StoreModule.forRoot({}),
      ],
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
