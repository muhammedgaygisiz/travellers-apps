import { Component } from '@angular/core';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';

@Component({
  standalone: true,
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">New Task Scenario</h1>
      <kosaml-scenario
        (saveScenario)="onSaveScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
  `,
  styles: [],
  imports: [KosamlPageFeatureModule, ScenarioComponent],
})
export class NewTaskScenarioPageComponent {
  onSaveScenario(scenario: any) {
    console.log(scenario);
  }
}
