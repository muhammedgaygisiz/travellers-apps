import { Component } from '@angular/core';

@Component({
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
})
export class NewUseScenarioPageComponent {
  onSaveScenario(scenario: any) {
    console.log(scenario);
  }
}
