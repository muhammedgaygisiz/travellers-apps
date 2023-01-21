import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConcreteUseCasePageComponent } from './containers/concrete-use-case-page.component';

const routes: Routes = [
  {
    path: 'new',
    component: ConcreteUseCasePageComponent,
  },
  {
    path: ':id',
    component: ConcreteUseCasePageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConcreteUseCaseRoutingModule {}
