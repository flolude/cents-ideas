import {InjectionToken} from '@angular/core';

export interface IAdminClientEnvironment {
  gatewayUrl: string;
  adminSocketUrl: string;
}

export const ENVIRONMENT = new InjectionToken<IAdminClientEnvironment>('ADMIN_CLIENT_ENVIRONMENT');

export * from './environment';
