import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MenuPage } from '../components/page/menu-page.component';
import { MenuService } from './menu.service';

@Component({
  template: `
    <menu-page
      class="ion-page"
      editMode
      [restaurant]="service.restaurant()"
      [menu]="service.menu()"
    />
  `,
  imports: [MenuPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class MenuEditContainer {
  service = inject(MenuService);
}
