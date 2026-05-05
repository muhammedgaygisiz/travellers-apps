import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { BusinessMenuVariantComponent } from '../business-menu-item-editor/business-menu-variant.component';
import { debounce, Field, form, required } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-menu-item',
  templateUrl: './business-menu-item.component.html',
  styleUrl: './business-menu-item.component.scss',
  imports: [IonButton, BusinessMenuVariantComponent, IonInput, IonItem, Field],
})
export class BusinessMenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  addedVariant = output<MenuItem>();

  itemChanged = output<MenuItem>();

  presentAddVariant = signal(false);

  itemModel = signal({
    name: this.item()?.name || '',
  });

  itemForm = form(this.itemModel, (schemaPath) => {
    required(schemaPath.name);
    debounce(schemaPath.name, 500);
  });

  onItemChange = effect(() => {
    const item = this.item();
    if (item) {
      this.itemForm.name().value.set(item?.name || '');
    }
  });

  showNewVariantComponent = computed(() => {
    return this.presentAddVariant();
  });

  onAddVariantClick(): void {
    this.presentAddVariant.set(true);
  }

  onAddVariant(variant: MenuItem): void {
    this.presentAddVariant.set(false);

    const currentItem = this.item();

    if (currentItem) {
      const newItem = {
        ...currentItem,
        variants: [...(currentItem.variants || []), variant],
      };

      this.addedVariant.emit(newItem);
    }
  }

  onCancelAddItem(): void {
    this.presentAddVariant.set(false);
  }

  onEditVariant(): void {
    // TODO
  }
}
