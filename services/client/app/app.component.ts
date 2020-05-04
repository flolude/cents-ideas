import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, fromEvent, merge, of } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import { UpdateAvailableEvent } from '@angular/service-worker';

import { TopLevelFrontendRoutes } from '@centsideas/enums';
import { PushNotificationService } from '@cic/shared';
import { AuthSelectors } from '@cic/store';
import { ServiceWorkerService } from './service-worker.service';

@Component({
  selector: 'cic-root',
  template: `
    <h1 id="title">CENTS Ideas</h1>
    <div *ngIf="availableSwUpdate" (click)="onUpdateServiceWorker()" id="update_banner">
      Click to update the app
    </div>
    <button (click)="checkUpdates()">Check for updates now</button>
    <span *ngIf="(authState$ | async)?.initializing">Initializing...</span>
    <span *ngIf="(authState$ | async)?.initialized">Initialized</span>
    <span *ngIf="(authState$ | async)?.accessToken">you're signed in</span>
    <h1 *ngIf="offline$ | async">You're offline</h1>
    <div>
      <a [routerLink]="[topLevelRoutes.Ideas]">Ideas</a>
      <br />
      <a [routerLink]="[topLevelRoutes.User]">User</a>
      <br />
      <a [routerLink]="[topLevelRoutes.Login]">Login</a>
    </div>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['app.component.sass'],
})
export class AppComponent implements OnDestroy {
  authState$ = this.store.select(AuthSelectors.state);
  offline$: Observable<boolean>;

  alive = true;
  topLevelRoutes = TopLevelFrontendRoutes;
  availableSwUpdate: UpdateAvailableEvent;

  constructor(
    private store: Store,
    private pushNotificationService: PushNotificationService,
    private serviceWorkerService: ServiceWorkerService,
    @Inject(PLATFORM_ID) private platform: string,
  ) {
    if (isPlatformBrowser(this.platform)) {
      this.handleOnlineOffline();
      this.pushNotificationService.initialize();
      this.serviceWorkerService.launchUpdateCheckingRoutine();
      this.serviceWorkerService.launchUpdateHandler(event => (this.availableSwUpdate = event));
    }
  }

  onUpdateServiceWorker() {
    this.serviceWorkerService.forceUpdateNow();
  }

  checkUpdates() {
    this.serviceWorkerService.checkUpdateNow();
  }

  handleOnlineOffline = () => {
    // FIXME this doesn't seem to be notified when turning off internet at os level
    this.offline$ = merge(
      of(!navigator.onLine),
      fromEvent(window, 'online').pipe(mapTo(false)),
      fromEvent(window, 'offline').pipe(mapTo(true)),
    );
  };

  ngOnDestroy() {
    this.alive = false;
  }
}
