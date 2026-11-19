import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Category } from 'model';
import { BusinessCategoryExtrasComponent } from '../business-category-extras/business-category-extras.component';
import type { CategoryDetails } from '../../utils/menu-edits';

/**
 * One category, opened from the menu list (GitHub issue #2182): its title and
 * subtitle with one Save, and its extras below, which keep their own add,
 * change and remove (issue #1598).
 */
@Component({
  selector: 'bt-category-editor',
  templateUrl: './category-editor.component.html',
  styleUrl: './category-editor.component.scss',
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonButton,
    IonIcon,
    TranslocoPipe,
    BusinessCategoryExtrasComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryEditorComponent {
  private readonly formBuilder = inject(FormBuilder);

  /** The category to edit; absent for a new one. */
  readonly category = input<Category>();
  readonly currency = input<string>();

  readonly save = output<CategoryDetails>();
  readonly saveExtras = output<Category['extrasBlock']>();
  readonly cancelEdit = output<void>();

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    subtitle: [''],
  });

  readonly load = effect(() => {
    const category = this.category();

    this.form.reset({
      title: category?.title ?? '',
      subtitle: category?.subtitle ?? '',
    });
  });

  saveCategory(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}
