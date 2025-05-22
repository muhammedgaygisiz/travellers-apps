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
import { MenuItem } from 'model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-item.component.html',
  styleUrl: './add-item.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem, ReactiveFormsModule],
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'add-item',
})
export class AddItemComponent {
  addItem = output<MenuItem>();

  private readonly formBuilder = inject(FormBuilder);

  newItemForm = this.formBuilder.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  isInvalid = toSignal(
    this.newItemForm.valueChanges.pipe(
      map(() => {
        return !this.newItemForm.valid;
      })
    ),
    { initialValue: !this.newItemForm.valid }
  );

  onAddCategory() {
    if (this.newItemForm.valid) {
      this.addItem.emit(this.newItemForm.value as MenuItem);
    }
  }
}
