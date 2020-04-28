import { createReducer, on } from '@ngrx/store';

import { SyncStatus } from '@cic/shared';
import { NotificationsActions } from './notifications.actions';
import { INotificationsReducerState } from './notifications.state';

const initialState: INotificationsReducerState = {
  persisted: null,
  formData: null,
  status: SyncStatus.Loading,
  error: '',
};

export const notificationsReducer = createReducer(
  initialState,
  on(NotificationsActions.getSettings, state => ({ ...state, status: SyncStatus.Loaded })),
  on(NotificationsActions.getSettingsDone, (state, { settings }) => ({
    ...state,
    status: SyncStatus.Loaded,
    persisted: settings,
  })),
  on(NotificationsActions.getSettingsFail, (state, { error }) => ({
    ...state,
    status: SyncStatus.Error,
    error,
  })),

  on(NotificationsActions.formChanged, (state, { value }) => ({ ...state, formData: value })),

  on(NotificationsActions.updateSettings, state => ({
    ...state,
    status: state.status === SyncStatus.Syncing ? SyncStatus.PatchSyncing : SyncStatus.Syncing,
  })),
  on(NotificationsActions.updateSettingsDone, (state, { settings }) => ({
    ...state,
    status: state.status === SyncStatus.PatchSyncing ? SyncStatus.Syncing : SyncStatus.Synced,
    persisted: settings,
  })),
  on(NotificationsActions.updateSettingsFail, (state, { error }) => ({
    ...state,
    status: SyncStatus.Error,
    error,
  })),
);
