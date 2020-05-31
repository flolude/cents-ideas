import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as helmet from 'helmet';
import {injectable} from 'inversify';
import {InversifyExpressServer} from 'inversify-express-utils';

import {RpcStatusHttpMap} from '@centsideas/rpc';
import {Logger} from '@centsideas/utils';
import {Environments} from '@centsideas/enums';
import {DependencyInjection} from '@centsideas/dependency-injection';
import {GlobalConfig} from '@centsideas/config';

import {GatewayConfig} from './gateway.config';

@injectable()
export class GatewayServer {
  // FIXME eventually add frontend to cors whitelist
  private corsWhitelist: string[] = [];

  constructor(
    private globalConfig: GlobalConfig,
    private config: GatewayConfig,
    private logger: Logger,
  ) {
    this.logger.info('launch in', this.globalConfig.get('global.environment'), 'mode');

    const server = new InversifyExpressServer(DependencyInjection.getContainer());
    server.setConfig((app: express.Application) => {
      app.use(helmet());
      app.use(
        cors({
          origin: (origin, callback) =>
            this.isOriginAllowed(origin)
              ? callback(null, true)
              : callback(Error('not allowed by cors'), false),
          credentials: true,
        }),
      );
      app.use(bodyParser.json());
      app.use(cookieParser());
    });

    server.setErrorConfig(app => {
      app.use(
        (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
          if (!err) return res.status(500);
          if (!err.code) return res.status(500);

          const message = err.details;
          const httpCode = RpcStatusHttpMap[err.code] || 500;
          const name = err.metadata?.get('name')[0] || '';
          const unexpected = httpCode >= 500 ? true : false;

          res.status(httpCode).json({message, unexpected, name});
        },
      );
    });
    server.build().listen(this.config.get('gateway.port'));
  }

  private isOriginAllowed = (origin: string | undefined) => {
    if (this.globalConfig.get('global.environment') === Environments.Dev) return true;
    if (origin && this.corsWhitelist.includes(origin)) return true;
    if (origin === undefined) return true;

    return false;
  };
}
