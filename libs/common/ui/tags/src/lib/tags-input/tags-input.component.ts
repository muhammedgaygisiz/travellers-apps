import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  output,
} from '@angular/core';
import { IonInput } from '@ionic/angular/standalone';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { stringIncludesDelimiter } from './utils/string-includes-delimiter';
import { removeDelimiterFromEndOfString } from './utils/remove-delimiter-from-end-of-string';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChipComponent } from 'common/ui/chip';

const REGEX_STRING_ONLY_CONTAINS_BLANK_SPACES = /^\s*$/;

@Component({
  selector: 'bt-tags-input',
  templateUrl: './tags-input.component.html',
  styleUrl: './tags-input.component.scss',
  imports: [
    IonInput,
    ReactiveFormsModule,
    AsyncPipe,
    TranslocoPipe,
    ChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsInputComponent implements OnInit {
  readonly = input<boolean>(false);
  tags = input<string[]>([]);
  suggestedTags = input<string[]>([]);
  tagChanges = output<string[]>();

  formGroup = new FormGroup({
    tagInput: new FormControl(''),
  });

  tagInputValueChanges$: Observable<void> | null = null;

  ngOnInit(): void {
    const control = this.formGroup.get('tagInput');
    if (control) {
      this.tagInputValueChanges$ = control.valueChanges.pipe(
        map((value) => {
          if (stringIncludesDelimiter(value)) {
            this.inputChange(removeDelimiterFromEndOfString(value));
          }
        }),
      );
    }
  }

  /**
   * Turns whatever is still in the field into a tag. Only a delimiter used to
   * do that, so a tag that was typed and then submitted, confirmed with Enter,
   * or left by tapping elsewhere was dropped without a word (issue #1391).
   * The input calls this on Enter and on blur, the owning form before it
   * submits.
   */
  commitPendingTag(): void {
    const pendingTag: string = this.formGroup.get('tagInput')?.value ?? '';

    if (!pendingTag) {
      return;
    }

    this.inputChange(pendingTag.trim());
  }

  /**
   * Enter commits the tag rather than submitting the surrounding form, which is
   * what pressing it while the tag field has focus is meant to do.
   */
  onEnter(event: Event): void {
    event.preventDefault();
    this.commitPendingTag();
  }

  inputChange(value: string): void {
    const isValidTag = !REGEX_STRING_ONLY_CONTAINS_BLANK_SPACES.test(value);
    const isUniqueTag = !this.tags().includes(value);
    if (isValidTag && isUniqueTag) {
      this.tagChanges.emit([...this.tags(), value]);
    }
    this.clearInput();
  }

  clearInput(): void {
    this.formGroup.get('tagInput')?.setValue('');
  }

  removeTag(tag: string): void {
    const updatedTags = this.tags().filter((t) => t !== tag);
    this.tagChanges.emit(updatedTags);
  }

  addSuggestedTag(tag: string): void {
    const isUniqueTag = !this.tags().includes(tag);
    if (isUniqueTag) {
      this.tagChanges.emit([...this.tags(), tag]);
    }
  }
}
