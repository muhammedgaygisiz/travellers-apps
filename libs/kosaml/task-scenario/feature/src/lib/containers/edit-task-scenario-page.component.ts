import { Component } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'kosaml-edit-task-scenario-page',
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Task Scenario</h1>
      <kosaml-scenario
        (saveScenario)="onSaveScenario($event)"
        [showDeleteButton]="true"
        (deleteScenario)="onDeleteScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
  `,
  styles: [],
})
export class EditTaskScenarioPageComponent {
  selectSubscription?: Subscription;

  // selectedTaskScenario$: Observable<any> = this.store.pipe();

  // ngOnInit() {
  // this.selectSubscription = this.route.params.pipe(
  //   map(params => params['id']),
  //   tap(id => this.store.dispatch(TaskScenarioPageActions.selectTaskScenario({ id }))),
  // ).subscribe();
  // }

  // ngOnDestroy() {
  //   this.selectSubscription.unsubscribe();
  // }

  onSaveScenario(scenario: any) {
    console.log(scenario);
    // this.store.dispatch(TaskScenarioActions.addTaskScenario({ taskScenario: scenario }));

    // this.router.navigate(['./project']);
  }

  onDeleteScenario(id: any) {
    console.log(id);

    //this.store.dispatch(TaskScenarioActions.deleteTaskScenario({ id }));
    //
    //this.router.navigate(['..'], { relativeTo: this.route });
  }
}
