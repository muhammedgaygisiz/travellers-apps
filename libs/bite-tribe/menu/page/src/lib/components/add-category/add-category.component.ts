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
import { Category } from 'model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-category.component.html',
  styleUrl: './add-category.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem, ReactiveFormsModule],
  selector: 'add-category',
})
export class AddCategoryComponent {
  addCategory = output<Category>();

  cancelAddCategory = output();

  private readonly formBuilder = inject(FormBuilder);

  newCategoryForm = this.formBuilder.group({
    title: ['', Validators.required],
    subtitle: [''],
  });

  isInvalid = toSignal(
    this.newCategoryForm.valueChanges.pipe(
      map(() => {
        return !this.newCategoryForm.valid;
      })
    ),
    { initialValue: !this.newCategoryForm.valid }
  );

  onAddCategory(): void {
    if (this.newCategoryForm.valid) {
      this.addCategory.emit(this.newCategoryForm.value as Category);
    }
  }
}
