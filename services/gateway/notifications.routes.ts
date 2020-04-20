import { injectable } from 'inversify';
import * as express from 'express';

import { ExpressAdapter } from './express-adapter';
import { NotificationsApiRoutes } from '@centsideas/enums';

@injectable()
export class NotificationsRoutes {
  private router = express.Router();

  constructor(private expressAdapter: ExpressAdapter) {}

  setup = (host: string): express.Router => {
    this.router.post(
      `/${NotificationsApiRoutes.SubscribePush}`,
      this.expressAdapter.makeJsonAdapter(`${host}/${NotificationsApiRoutes.SubscribePush}`),
    );

    this.router.post(
      `/${NotificationsApiRoutes.UpdateSettings}`,
      this.expressAdapter.makeJsonAdapter(`${host}/${NotificationsApiRoutes.UpdateSettings}`),
    );

    this.router.get(
      `/`,
      this.expressAdapter.makeJsonAdapter(`${host}/${NotificationsApiRoutes.GetSettings}`),
    );

    return this.router;
  };
}