import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EssentialUseCasePageComponent } from './containers/essential-use-case-page.component';

const routes: Routes = [
  {
    path: 'new',
    component: EssentialUseCasePageComponent,
  },
  {
    path: ':id',
    component: EssentialUseCasePageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EssentialUseCaseRoutingModule {}
