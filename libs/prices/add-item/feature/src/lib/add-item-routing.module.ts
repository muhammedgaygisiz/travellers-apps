import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {AddItemComponent} from "./components/add-item.component";

const routes: Routes = [
  {
    path: '',
    component: AddItemComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddItemRoutingModule {
}
