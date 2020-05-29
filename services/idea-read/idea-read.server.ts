import {injectable, inject} from 'inversify';
import * as http from 'http';

import {RpcServer, RpcServerFactory, RPC_SERVER_FACTORY} from '@centsideas/rpc';
import {GlobalEnvironment} from '@centsideas/environment';
import {Logger} from '@centsideas/utils';
import {IdeaRead, loadProtoService, IdeaReadService} from '@centsideas/schemas';

import {IdeaProjector} from './idea.projector';

@injectable()
export class IdeaReadServer {
  private rpcServer: RpcServer = this.rpcServerFactory();

  constructor(
    private globalEnv: GlobalEnvironment,
    private logger: Logger,
    private projector: IdeaProjector,
    @inject(RPC_SERVER_FACTORY) private rpcServerFactory: RpcServerFactory,
  ) {
    this.logger.info('launch in', this.globalEnv.environment, 'mode');

    http
      .createServer((_, res) => res.writeHead(this.rpcServer.isRunning ? 200 : 500).end())
      .listen(3000);

    this.rpcServer.addService<IdeaRead>(loadProtoService(IdeaReadService).service, {
      getById: ({id, userId}) => this.projector.getById(id, userId),
      getAll: async () => {
        const ideas = await this.projector.getAll();
        return {ideas};
      },
    });
  }
}
