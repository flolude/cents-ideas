import {NgModule, Inject} from '@angular/core';
import {ServiceWorkerModule} from '@angular/service-worker';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';

import {RootStoreModule} from '@cic/store';
import {ENVIRONMENT, IClientEnvironment} from '@cic/environment';
import {AppBaseModule} from './app-base.module';
import {AppComponent} from './app.component';

@NgModule({
  imports: [
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: false}),
    StoreDevtoolsModule.instrument(),
    RootStoreModule,
    AppBaseModule,
  ],
  bootstrap: [AppComponent],
})
export class AppDevModule {
  constructor(@Inject(ENVIRONMENT) private environment: IClientEnvironment) {
    console.log(`🛠️ Launching development app`, this.environment);
  }
}
