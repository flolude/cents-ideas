import { NgModule, Inject } from '@angular/core';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { AppBaseModule } from './app-base.module';
import { ENVIRONMENT, IEnvironment } from '../environments';
import { AppBaseStoreModule } from './app-base.store.module';

@NgModule({
  imports: [ServiceWorkerModule.register('ngsw-worker.js'), AppBaseModule, AppBaseStoreModule],
  bootstrap: [AppComponent],
})
export class AppProdModule {
  constructor(@Inject(ENVIRONMENT) private env: IEnvironment) {
    console.log(`🚀 Launching production app`, { env: this.env });
  }
}
