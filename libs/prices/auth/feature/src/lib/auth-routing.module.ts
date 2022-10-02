import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthContainerComponent } from './integration/auth-container.component';

const routes: Routes = [
  {
    path: '',
    component: AuthContainerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
