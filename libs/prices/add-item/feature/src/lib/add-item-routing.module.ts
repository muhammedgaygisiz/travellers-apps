import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {AddItemComponent} from "./components/add-item.component";
import {AddItemContainerComponent} from "./integration/add-item-container.component";

const routes: Routes = [
  {
    path: '',
    component: AddItemContainerComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddItemRoutingModule {
}
