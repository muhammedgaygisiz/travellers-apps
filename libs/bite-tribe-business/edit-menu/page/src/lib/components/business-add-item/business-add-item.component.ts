import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import {
  IonButton,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type { MenuItem } from 'model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-add-item.component.html',
  styleUrl: './business-add-item.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem, ReactiveFormsModule],
  selector: 'business-add-item',
})
export class BusinessAddItemComponent {
  addItem = output<MenuItem>();

  cancelAddItem = output();

  private readonly formBuilder = inject(FormBuilder);

  newItemForm = this.formBuilder.group({
    name: ['', Validators.required],
    description: [''],
    ingredients: [''],
    notes: [''],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  isInvalid = toSignal(
    this.newItemForm.valueChanges.pipe(
      map(() => {
        return !this.newItemForm.valid;
      }),
    ),
    { initialValue: !this.newItemForm.valid },
  );

  onAddItem(): void {
    if (this.newItemForm.valid) {
      this.addItem.emit(this.newItemForm.value as MenuItem);
    }
  }
}
