import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { Menu, MenuItem } from 'model';
import { IonReorderGroup } from '@ionic/angular/standalone';
import { CategoryComponent } from '../category/category.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategoryComponent, IonReorderGroup, TranslocoPipe],
})
export class MenuComponent {
  menu = input<Menu>();

  linkedMenu = linkedSignal(() => this.menu());

  /**
   * The currency the menu's prices are stated in (issue #1102).
   *
   * Read off the menu by default, so the authenticated page needs no change and
   * a public page that already has the menu need not pass it twice.
   */
  readonly currency = computed(() => this.menu()?.currency);

  canCreateBite = input(true, { transform: booleanAttribute });

  createBiteClick = output<MenuItem>();
}
