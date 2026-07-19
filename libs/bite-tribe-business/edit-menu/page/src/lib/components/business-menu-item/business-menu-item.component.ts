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
import { IonButton, IonInput } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { BusinessMenuVariantComponent } from '../business-menu-item-editor/business-menu-variant.component';
import { debounce, FormField, form, required } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-menu-item',
  templateUrl: './business-menu-item.component.html',
  styleUrl: './business-menu-item.component.scss',
  imports: [IonButton, BusinessMenuVariantComponent, IonInput, FormField],
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

  onEditVariant(changes: MenuItem, index?: number): void {
    const item = this.item();

    if (!item) {
      return;
    }

    if (index != null) {
      this.emitVariantChanges(item, changes, index);
      return;
    }
    this.emitItemChanges(item, changes);
  }

  private emitItemChanges(item: MenuItem, changes: MenuItem): void {
    this.itemChanged.emit({
      ...item,
      ...changes,
    });
  }

  private emitVariantChanges(
    item: MenuItem,
    changes: MenuItem,
    index: number,
  ): void {
    if (!item.variants || !item.variants.length) {
      return;
    }

    const newVariants = [...item.variants];
    newVariants[index] = changes;
    this.itemChanged.emit({
      ...item,
      variants: newVariants,
    });
  }
}
