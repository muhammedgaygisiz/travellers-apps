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
import { createEntityId } from 'utils';

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

  /**
   * A category is born with its id (issue #1099).
   *
   * Generated here rather than assigned when the category is saved, because the
   * editor keys by id from the moment the category exists - an id handed out
   * later would leave the first edits keyed by title, which is the repointing
   * the ids exist to prevent.
   */
  onAddCategory(): void {
    if (this.newCategoryForm.valid) {
      this.addCategory.emit({
        ...(this.newCategoryForm.value as Category),
        id: createEntityId(),
        items: [],
      });
    }
  }
}
