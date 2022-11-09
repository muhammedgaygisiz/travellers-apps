import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { KosamlShellModule } from '@travellers-apps/kosaml/shell/feature';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, KosamlShellModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
