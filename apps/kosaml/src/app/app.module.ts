import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { KosamlShellModule } from '@travellers-apps/kosaml/shell/feature';
import { AppComponent } from './app.component';
import { SiteModule } from '@travellers-apps/kosaml/site/feature';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { KosamlStoreFeatureModule } from '@travellers-apps/kosaml/store/feature';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent],
  imports: [
    KosamlShellModule,
    KosamlStoreFeatureModule.forRoot(environment),
    BrowserModule,
    BrowserAnimationsModule,
    SiteModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
