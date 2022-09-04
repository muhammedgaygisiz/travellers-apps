import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import { HomeContainerComponent } from './integration';

const routes: Routes = [
  {
    path: '',
    component: HomeContainerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeComponentRoutingModule {
}
