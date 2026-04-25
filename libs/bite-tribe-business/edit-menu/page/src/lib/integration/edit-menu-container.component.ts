import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditMenuPage } from '../components/page/edit-menu-page.component';
import { EditMenuService } from './edit-menu.service';

@Component({
  template: `
    <edit-menu-page
      class="ion-page"
      [restaurant]="service.restaurant()"
      [menu]="service.menu()"
      (saveMenu)="service.saveMenu($event)"
    />
  `,
  imports: [EditMenuPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMenuContainer {
  service = inject(EditMenuService);
}
