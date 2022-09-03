import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {HomeContainer} from "./integration/home.container";

const routes: Routes = [
  {
    path: '',
    component: HomeContainer,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeComponentRoutingModule {
}
