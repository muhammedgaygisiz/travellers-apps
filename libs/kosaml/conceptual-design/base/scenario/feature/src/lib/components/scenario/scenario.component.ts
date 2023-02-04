import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
// import { uuid } from 'uuidv4';
import { KosamlErrorMatcher } from './KosamlErrorMatcher';
import { CommonModule } from '@angular/common';
import { CardComponent } from '@travellers-apps/kosaml/card/feature';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Scenario } from '@travellers-apps/kosaml/model/feature';

@Component({
  standalone: true,
  selector: 'kosaml-scenario',
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss'],
  imports: [
    CommonModule,
    CardComponent,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
  ],
})
export class ScenarioComponent implements OnChanges {
  @Input()
  model?: Scenario | null;

  @Input()
  showDeleteButton?: boolean;

  @Output()
  saveScenario = new EventEmitter<Scenario>();

  @Output()
  deleteScenario = new EventEmitter<string>();

  scenarioForm: FormGroup = new FormGroup({
    title: new FormControl(null, [Validators.required]),
    description: new FormControl(null),
  });

  matcher = new KosamlErrorMatcher();

  onSubmit() {
    if (!this.scenarioForm?.value) {
      return;
    }

    // const title = this.scenarioForm.value.title;
    // const description = this.scenarioForm.value.description || '';

    // TODO: Fix this!
    // this.saveScenario.emit({title, description, id: uuid()});

    this.scenarioForm.reset();
  }

  ngOnChanges() {
    this.setFormFields(this.model);
  }

  setFormFields(model: Scenario | undefined | null) {
    if (model) {
      this.scenarioForm.patchValue(model);
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
