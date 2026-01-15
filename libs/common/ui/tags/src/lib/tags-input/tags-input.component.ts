import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  output,
} from '@angular/core';
import {
  IonChip,
  IonIcon,
  IonInput,
  IonLabel,
} from '@ionic/angular/standalone';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { stringIncludesDelimiter } from './utils/string-includes-delimiter';
import { removeDelimiterFromEndOfString } from './utils/remove-delimiter-from-end-of-string';

const REGEX_STRING_ONLY_CONTAINS_BLANK_SPACES = /^\s*$/;

@Component({
  selector: 'bt-tags-input',
  templateUrl: './tags-input.component.html',
  styleUrl: './tags-input.component.scss',
  imports: [
    IonInput,
    IonChip,
    IonLabel,
    IonIcon,
    ReactiveFormsModule,
    AsyncPipe,
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

  tagInputValueChanges$: Observable<any> | null = null;

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
