import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnChanges,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { v4 as uuid } from 'uuid';
import { KosamlErrorMatcher } from './KosamlErrorMatcher';
import { CardComponent } from '@travellers-apps/kosaml/card/feature';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Scenario } from '@travellers-apps/kosaml/model/feature';

@Component({
  selector: 'kosaml-scenario',
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss'],
  imports: [
    CardComponent,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioComponent implements OnChanges {
  readonly model = input<Scenario | null>();

  readonly showDeleteButton = input<boolean>();

  readonly saveScenario = output<Scenario>();

  readonly deleteScenario = output<string>();

  scenarioForm: FormGroup = new FormGroup({
    title: new FormControl(null, [Validators.required]),
    description: new FormControl(null),
  });

  matcher = new KosamlErrorMatcher();

  onSubmit(): void {
    if (!this.scenarioForm?.value) {
      return;
    }

    const title = this.scenarioForm.value.title;
    const description = this.scenarioForm.value.description || '';

    this.saveScenario.emit({ title, description, id: uuid() });

    this.scenarioForm.reset();
  }

  ngOnChanges(): void {
    this.setFormFields(this.model());
  }

  setFormFields(model: Scenario | undefined | null): void {
    if (model) {
      this.scenarioForm.patchValue(model);
    }
  }

  onDelete(): void {
    let id = '';

    const model = this.model();
    if (model?.id) {
      id = model.id;
    }

    this.deleteScenario.emit(id);
  }
}
