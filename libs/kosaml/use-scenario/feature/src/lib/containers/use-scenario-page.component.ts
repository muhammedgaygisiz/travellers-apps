import { Component } from '@angular/core';

@Component({
  selector: 'kosaml-use-scenario-page',
  template: `
    <kosaml-page>
      <kosaml-scenario
        (saveScenario)="onSaveScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
  `,
  styles: [],
})
export class UseScenarioPageComponent {
  onSaveScenario(scenario: any) {
    console.log(scenario);
  }
}
