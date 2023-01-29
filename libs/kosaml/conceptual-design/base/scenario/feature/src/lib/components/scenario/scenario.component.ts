import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { uuid } from 'uuidv4';
import { KosamlErrorMatcher } from './KosamlErrorMatcher';
import { CommonModule } from '@angular/common';
import { CardComponent } from '@travellers-apps/kosaml/card/feature';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';

@Component({
  standalone: true,
  selector: 'kosaml-scenario',
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss'],
  imports: [
    CommonModule,
    CardComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
  ],
})
export class ScenarioComponent implements OnInit, OnChanges {
  @Input()
  model: any;

  @Input()
  showDeleteButton?: boolean;

  @Output()
  saveScenario = new EventEmitter<any>();

  @Output()
  deleteScenario = new EventEmitter<string>();

  scenarioForm: FormGroup;

  matcher = new KosamlErrorMatcher();

  titleFormControl: FormControl = new FormControl(null, [Validators.required]);
  descriptionFormControl: FormControl = new FormControl(null);

  constructor() {
    this.scenarioForm = new FormGroup({
      title: this.titleFormControl,
      description: this.descriptionFormControl,
    });
  }

  ngOnInit() {
    this.setFormFields(this.model);
  }

  onSubmit() {
    if (!this.scenarioForm?.value) {
      return;
    }

    const title = this.scenarioForm.value.title;
    const description = this.scenarioForm.value.description || '';

    this.saveScenario.emit({ title, description, id: uuid() });

    this.scenarioForm.reset();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('#mo', changes);
    this.setFormFields(this.model);
  }

  setFormFields(model: any) {
    if (this.model) {
      this.titleFormControl.patchValue(model.title);
      this.descriptionFormControl.patchValue(model.description);
    }
  }

  onDelete() {
    let id = '';

    if (this.model?.id) {
      id = this.model.id;
    }

    this.deleteScenario.next(id);
  }
}
