import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { BodyComponent } from './components/body/body.component';
import { ContentComponent } from './components/content/content.component';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ProjectComponent } from './components/sidebar/project/project.component';
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MenuBarComponent } from './components/menu-bar/menu-bar.component';
import { MatMenuModule } from '@angular/material/menu';

@NgModule({
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    RouterModule,
    MatSidenavModule,
    MatTreeModule,
    MatButtonModule,
    MatMenuModule,
  ],
  declarations: [
    HeaderComponent,
    BodyComponent,
    ContentComponent,
    SidebarComponent,
    ProjectComponent,
    MenuBarComponent,
  ],
  exports: [HeaderComponent, BodyComponent],
})
export class SiteModule {}
