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
import type { Category } from 'model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-add-category.component.html',
  styleUrl: './business-add-category.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem, ReactiveFormsModule],
  selector: 'business-add-category',
})
export class BusinessAddCategoryComponent {
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
      }),
    ),
    { initialValue: !this.newCategoryForm.valid },
  );

  onAddCategory(): void {
    if (this.newCategoryForm.valid) {
      this.addCategory.emit(this.newCategoryForm.value as Category);
    }
  }
}
