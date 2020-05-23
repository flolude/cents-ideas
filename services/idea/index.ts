// tslint:disable-next-line:no-var-requires
if (!process.env.environment) require('../../register-aliases').registerAliases();

import {EventListener, EventDispatcher} from '@centsideas/event-sourcing2';
import {DependencyInjection} from '@centsideas/dependency-injection';
import {GlobalEnvironment} from '@centsideas/environment';
import {UTILS_TYPES, Logger} from '@centsideas/utils';
import {RPC_TYPES, rpcServerFactory, RpcServer} from '@centsideas/rpc';
import {Services} from '@centsideas/enums';

import {IdeaServer} from './idea.server';
import {IdeaService} from './idea.service';
import {IdeaEnvironment} from './idea.environment';
import {IdeaEventStore} from './idea.event-store';

DependencyInjection.registerProviders(
  GlobalEnvironment,
  EventListener,
  EventDispatcher,
  IdeaServer,
  RpcServer,
  IdeaService,
  IdeaEnvironment,
  IdeaEventStore,
);
DependencyInjection.registerConstant(UTILS_TYPES.SERVICE_NAME, Services.Idea);
DependencyInjection.registerConstant(UTILS_TYPES.LOGGER_COLOR, [60, 100, 80]);
DependencyInjection.registerSingleton(Logger);
DependencyInjection.registerFactory(RPC_TYPES.RPC_SERVER_FACTORY, rpcServerFactory);
DependencyInjection.bootstrap(IdeaServer);
