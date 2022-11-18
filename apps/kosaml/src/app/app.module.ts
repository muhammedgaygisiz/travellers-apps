import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { KosamlShellModule } from '@travellers-apps/kosaml/shell/feature';
import { AppComponent } from './app.component';
import { SiteModule } from '@travellers-apps/kosaml/site/feature';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    KosamlShellModule,
    SiteModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
