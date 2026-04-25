import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MenuPage } from 'bite-tribe/menu';
import { EditMenuService } from './edit-menu.service';

@Component({
  template: `
    <menu-page
      class="ion-page"
      editMode
      [restaurant]="service.restaurant()"
      [menu]="service.menu()"
      (saveMenu)="service.saveMenu($event)"
    />
  `,
  imports: [MenuPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMenuContainer {
  service = inject(EditMenuService);
}
