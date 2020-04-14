import * as __ngrxEffectsTypes from '@ngrx/effects/src/models';
import * as __ngrxStoreTypes from '@ngrx/store/src/models';
import * as __rxjsTypes from 'rxjs';

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap, map, catchError, tap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';

import { TopLevelFrontendRoutes, UserFrontendRoutes } from '@cents-ideas/enums';

import { AuthActions } from './auth.actions';
import { AuthService } from './auth.service';
import { AuthSelectors } from './auth.selectors';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private router: Router,
    private store: Store,
  ) {}

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email }) =>
        this.authService.login(email).pipe(
          map(() => AuthActions.loginDone()),
          catchError(error => of(AuthActions.loginFail({ error }))),
        ),
      ),
    ),
  );

  // TODO implemnt all those effects
  /* confirmLogin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.confirmLogin),
      withLatestFrom(this.store.select(AuthSelectors.selectAuthState)),
      switchMap(([action, authState]) => {
        console.log('confirm login.... authstate', authState);
        if (authState.token) {
          console.log('confirm login ... save token from auth state');
          this.authService.saveToken(authState.token);
          return [];
        }
        return this.authService.confirmLogin(action.token).pipe(
          map(({ token, user }) => AuthActions.confirmLoginDone({ token, user })),
          catchError(error => of(AuthActions.confirmLoginFail({ error }))),
        );
      }),
    ),
  );
 */
  /* confirmLoginDone$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.confirmLoginDone),
        tap(action => this.authService.saveToken(action.token)),
        tap(() => this.router.navigate([TopLevelFrontendRoutes.User, UserFrontendRoutes.Me])),
      ),
    { dispatch: false },
  );
 */
  authenticate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.authenticate),
      switchMap(() => {
        console.log('authenticate..., found token: ', this.authService.token);
        if (this.authService.token) {
          return this.authService.authenticate().pipe(
            map(data => AuthActions.authenticateDone(data)),
            catchError(error => of(AuthActions.authenticateFail({ error }))),
          );
        } else {
          return [AuthActions.authenticateNoToken()];
        }
      }),
    ),
  );

  /* authenticateDone$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authenticateDone),
        tap(action => this.authService.saveToken(action.token)),
      ),
    { dispatch: false },
  ); */

  authenticateFail$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authenticateFail),
        tap(() => this.authService.removeToken()),
      ),
    { dispatch: false },
  );
}
