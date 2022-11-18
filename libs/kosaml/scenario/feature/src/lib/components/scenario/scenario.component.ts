import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { uuid } from 'uuidv4';
import { KosamlErrorMatcher } from './KosamlErrorMatcher';

@Component({
  selector: 'kosaml-scenario',
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss'],
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
    console.log(changes);
    this.setFormFields(this.model);
  }

  setFormFields(model: any) {
    if (this.model) {
      this.titleFormControl.setValue(model.title);
      this.descriptionFormControl.setValue(model.description);
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
