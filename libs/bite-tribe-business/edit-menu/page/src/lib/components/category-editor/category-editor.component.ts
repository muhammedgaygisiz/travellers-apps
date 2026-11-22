import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { Category } from 'model';
import { BusinessCategoryExtrasComponent } from '../business-category-extras/business-category-extras.component';
import type { CategoryDetails } from '../../utils/menu-edits';

/**
 * One category, opened from the menu list (GitHub issue #2182): its title and
 * subtitle with one Save, and its extras below, which keep their own add,
 * change and remove (issue #1598).
 */
/**
 * Which sentence the delete question uses (GitHub issue #2260): what goes
 * with the category, and nothing it does not hold. Dishes first, because
 * that sentence already names the extras with them.
 */
export const deleteConfirmMessageKey = (
  dishCount: number,
  extras: readonly unknown[],
): string => {
  if (dishCount) {
    return 'menu-category-delete-confirm-message-dishes';
  }

  return extras.length
    ? 'menu-category-delete-confirm-message'
    : 'menu-category-delete-confirm-message-empty';
};

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
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  /** The category to edit; absent for a new one. */
  readonly category = input<Category>();
  readonly currency = input<string>();

  readonly save = output<CategoryDetails>();
  readonly saveExtras = output<Category['extrasBlock']>();
  readonly cancelEdit = output<void>();
  /** The owner confirmed deleting the stored category (GitHub issue #2181). */
  readonly deleteCategory = output<void>();

  /** How many dishes a delete would take with it. */
  readonly dishCount = computed(() => this.category()?.items?.length ?? 0);

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

  /**
   * Asks before deleting the category, because a delete is saved at once and
   * has no undo (GitHub issue #2181). Its dishes, their variants and its
   * extras go with it, and the question counts the dishes, so an owner who
   * meant to empty a heading sees what else it holds. A category with neither
   * dishes nor extras says it is empty rather than mentioning extras it does
   * not have (#2260).
   */
  async confirmDelete(): Promise<void> {
    const category = this.category();

    if (!category) {
      return;
    }

    const dishCount = this.dishCount();
    const alert = await this.alertController.create({
      header: this.transloco.translate('menu-category-delete-confirm-title', {
        title: category.title,
      }),
      message: this.transloco.translate(
        deleteConfirmMessageKey(dishCount, category.extrasBlock?.extras ?? []),
        { count: dishCount },
      ),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('delete'),
          role: 'destructive',
          handler: (): void => this.deleteCategory.emit(),
        },
      ],
    });

    await alert.present();
  }
}
