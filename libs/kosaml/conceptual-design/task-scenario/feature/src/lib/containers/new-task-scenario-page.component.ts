import { Component } from '@angular/core';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">New Task Scenario</h1>
      <kosaml-scenario
        (saveScenario)="onSaveScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
  `,
  styles: [],
})
export class NewTaskScenarioPageComponent {
  onSaveScenario(scenario: any) {
    console.log(scenario);
  }
}
