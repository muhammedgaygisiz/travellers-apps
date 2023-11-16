import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from '@travellers-apps/kosaml/page/feature';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';
import { Scenario } from '@travellers-apps/kosaml/model/feature';

@Component({
  standalone: true,
  selector: 'kosaml-edit-task-scenario-page',
  template: `
    <kosaml-page>
      <h1 class="mat-headline-4">New Use Scenario</h1>
      <kosaml-scenario (saveScenario)="onSaveScenario($event)" />
    </kosaml-page>
  `,
  styles: [],
  imports: [PageComponent, ScenarioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewUseScenarioPageComponent {
  onSaveScenario(scenario: Scenario) {
    console.log(scenario);
  }
}
