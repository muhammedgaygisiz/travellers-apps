import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { IonReorderGroup } from '@ionic/angular/standalone';
import type { Category, MenuItem } from 'model';
import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  imports: [MenuItemComponent, IonReorderGroup],
  selector: 'category',
})
export class CategoryComponent {
  category = input<Category>();

  linkedCategory = linkedSignal(() => this.category());

  createBiteClick = output<MenuItem>();
}
