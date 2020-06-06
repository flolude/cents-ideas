import {injectable, inject} from 'inversify';
import * as http from 'http';

import {RpcServer, RPC_SERVER_FACTORY, RpcServerFactory, RpcMethod} from '@centsideas/rpc';
import {IdeaId} from '@centsideas/types';
import {IdeaCommandsService, IdeaCommands} from '@centsideas/schemas';

import {IdeaService} from './idea.service';

@injectable()
export class IdeaServer implements IdeaCommands.Service {
  private rpcServer: RpcServer = this.rpcServerFactory({
    services: [IdeaCommandsService],
    handlerClassInstance: this,
  });

  constructor(
    private service: IdeaService,
    @inject(RPC_SERVER_FACTORY) private rpcServerFactory: RpcServerFactory,
  ) {
    http
      .createServer((_, res) => res.writeHead(this.rpcServer.isRunning ? 200 : 500).end())
      .listen(3000);
  }

  @RpcMethod(IdeaCommandsService)
  async create({userId}: IdeaCommands.CreateIdea) {
    const id = IdeaId.generate();
    const upsertedId = await this.service.create(id, userId);
    return {id: upsertedId};
  }

  @RpcMethod(IdeaCommandsService)
  async rename({id, userId, title}: IdeaCommands.RenameIdea) {
    return this.service.rename(id, userId, title);
  }

  @RpcMethod(IdeaCommandsService)
  async editDescription({id, userId, description}: IdeaCommands.EditIdeaDescription) {
    return this.service.editDescription(id, userId, description);
  }

  @RpcMethod(IdeaCommandsService)
  async updateTags({id, userId, tags}: IdeaCommands.UpdateIdeaTags) {
    return this.service.updateTags(id, userId, tags);
  }

  @RpcMethod(IdeaCommandsService)
  async publish({id, userId}: IdeaCommands.PublishIdea) {
    return this.service.publish(id, userId);
  }

  @RpcMethod(IdeaCommandsService)
  async delete({id, userId}: IdeaCommands.DeleteIdea) {
    return this.service.delete(id, userId);
  }

  @RpcMethod(IdeaCommandsService)
  async getEvents({after: from}: IdeaCommands.GetEvents) {
    const events = await this.service.getEvents(from);
    return {events};
  }
}
