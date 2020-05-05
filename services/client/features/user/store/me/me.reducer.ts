import { createReducer, on } from '@ngrx/store';

import { SyncStatus } from '@cic/shared';
import { AuthActions } from '@cic/store';
import { MeActions } from './me.actions';
import { IMeReducerState } from './me.state';

const initialState: IMeReducerState = {
  formData: null,
  status: SyncStatus.Loaded,
  error: '',
};

export const meReducer = createReducer(
  initialState,
  on(MeActions.formChanged, (state, { value }) => ({ ...state, formData: value })),
  on(MeActions.updateUser, state => ({
    ...state,
    status: state.status === SyncStatus.Syncing ? SyncStatus.PatchSyncing : SyncStatus.Syncing,
  })),
  on(MeActions.updateUserFail, (state, { error }) => ({
    ...state,
    status: SyncStatus.Error,
    error: error.error,
  })),
  on(MeActions.updateUserDone, (state, { updated }) => ({
    ...state,
    persisted: updated,
    status: state.status === SyncStatus.PatchSyncing ? SyncStatus.Syncing : SyncStatus.Synced,
  })),

  on(MeActions.confirmEmailChange, state => ({ ...state, status: SyncStatus.Loading })),
  on(MeActions.confirmEmailChangeFail, (state, { error }) => ({
    ...state,
    status: SyncStatus.Error,
    error,
  })),
  on(MeActions.confirmEmailChangeDone, state => ({
    ...state,
    status: SyncStatus.Loaded,
  })),

  on(AuthActions.logoutDone, state => ({ ...state, persisted: null, status: SyncStatus.None })),
);