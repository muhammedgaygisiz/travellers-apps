import { Component } from '@angular/core';
import { PageComponent } from '@travellers-apps/kosaml/page/feature';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';

@Component({
  standalone: true,
  selector: 'kosaml-edit-task-scenario-page',
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">New Use Scenario</h1>
      <kosaml-scenario
        (saveScenario)="onSaveScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
  `,
  styles: [],
  imports: [PageComponent, ScenarioComponent],
})
export class NewUseScenarioPageComponent {
  onSaveScenario(scenario: any) {
    console.log(scenario);
  }
}
