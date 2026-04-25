import {
  ChangeDetectionStrategy,
  Component,
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

  createBiteClick = output<MenuItem>();
}
