import { injectable } from 'inversify';
import * as express from 'express';
import * as bodyParser from 'body-parser';

import { Logger, ExpressAdapter } from '@cents-ideas/utils';

import { IIdeasServiceEnvironment } from './environment';
import { IdeasService } from './ideas.service';
import { IServer } from '@cents-ideas/models';

@injectable()
export class IdeasServer implements IServer {
  private app = express();

  constructor(private logger: Logger, private ideasService: IdeasService, private expressAdapter: ExpressAdapter) {}

  start = (env: IIdeasServiceEnvironment) => {
    this.logger.debug('initialized with env: ', env);
    const { port } = env;

    this.app.use(bodyParser.json());

    this.app.post('/create', this.expressAdapter.json(this.ideasService.createEmptyIdea));
    this.app.post('/save-draft', this.expressAdapter.json(this.ideasService.saveDraft));
    this.app.post('/publish', this.expressAdapter.json(this.ideasService.publish));
    this.app.post('/update', this.expressAdapter.json(this.ideasService.update));
    this.app.post('/unpublish', this.expressAdapter.json(this.ideasService.unpublish));
    this.app.post('/delete', this.expressAdapter.json(this.ideasService.delete));

    this.app.listen(port, () => this.logger.info('ideas service listening on internal port', port));
  };
}