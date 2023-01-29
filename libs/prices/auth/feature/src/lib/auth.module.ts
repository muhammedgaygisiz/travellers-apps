import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './components/auth.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthContainerComponent } from './integration/auth-container.component';
import { CardComponent } from '@travellers-apps/prices/card/feature';
import { PageComponent } from '@travellers-apps/prices/page/feature';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    AuthRoutingModule,
    CardComponent,
    PageComponent,
  ],
  declarations: [AuthComponent, AuthContainerComponent],
  exports: [AuthComponent],
})
export class AuthModule {}
