import 'reflect-metadata';
// tslint:disable-next-line:no-var-requires
if (process.env.ENV === 'dev') require('../../register-aliases').registerAliases();

import { MessageBroker } from '@centsideas/event-sourcing';
import { LoggerPrefixes } from '@centsideas/enums';
import { getProvider, registerProviders, ExpressAdapter } from '@centsideas/utils';

import { ConsumerServer } from './consumer.server';
import { ProjectionDatabase } from './projection-database';
import { QueryService } from './query.service';
import { IdeasProjection } from './ideas.projection';
import { ReviewsProjection } from './reviews.projection';
import { UsersProjection } from './users.projection';

process.env.LOGGER_PREFIX = LoggerPrefixes.Consumer;

registerProviders(
  MessageBroker,
  ConsumerServer,
  ProjectionDatabase,
  ExpressAdapter,
  QueryService,
  IdeasProjection,
  ReviewsProjection,
  UsersProjection,
);
const server: ConsumerServer = getProvider(ConsumerServer);

server.start();
