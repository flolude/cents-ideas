import { HttpStatusCodes } from '@cents-ideas/enums';
import { HttpRequest, HttpResponse } from '@cents-ideas/models';
import env from './environment';
import { IdeaError } from './errors';
import { IdeaCommandHandler } from './idea.command-handler';

const { logger } = env;

export class IdeasService {
  constructor(private readonly commandHandler: IdeaCommandHandler) {}

  createEmptyIdea = (_req: HttpRequest): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('create');
        const idea = await this.commandHandler.create();
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { created: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('create', error);
        resolve(this.handleError(error));
      }
    });

  saveDraft = (req: HttpRequest<{ title?: string; description?: string }, { id: string }>): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('save draft');
        const idea = await this.commandHandler.saveDraft(req.params.id, req.body.title, req.body.description);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { saved: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('save draft', error);
        resolve(this.handleError(error));
      }
    });

  discardDraft = (req: HttpRequest<{}, { id: string }>): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('discard draft');
        const idea = await this.commandHandler.discardDraft(req.params.id);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { updated: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('discard draft', error);
        resolve(this.handleError(error));
      }
    });

  commitDraft = (req: HttpRequest<{ title?: string; description?: string }, { id: string }>): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('commit draft');
        const idea = await this.commandHandler.commitDraft(req.params.id, req.body.title, req.body.description);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { updated: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('commit draft', error);
        resolve(this.handleError(error));
      }
    });

  publish = (req: HttpRequest): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('publish');
        const idea = await this.commandHandler.publish(req.params.id);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { published: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('publish', error);
        resolve(this.handleError(error));
      }
    });

  // FIXME dto interfaces for payloads
  update = (req: HttpRequest<{ title?: string; description?: string }>): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('update');
        const idea = await this.commandHandler.update(req.params.id, req.body.title, req.body.description);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { unpublish: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('update', error);
        resolve(this.handleError(error));
      }
    });

  unpublish = (req: HttpRequest): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('unpublish');
        const idea = await this.commandHandler.unpublish(req.params.id);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { unpublish: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('unpublish', error);
        resolve(this.handleError(error));
      }
    });

  delete = (req: HttpRequest): Promise<HttpResponse> =>
    new Promise(async resolve => {
      try {
        logger.info('delete');
        const idea = await this.commandHandler.delete(req.params.id);
        resolve({
          status: HttpStatusCodes.Accepted,
          body: { deleted: idea.state },
          headers: {},
        });
      } catch (error) {
        logger.error('delete', error);
        resolve(this.handleError(error));
      }
    });

  private handleError = (error: IdeaError, overrides: Partial<HttpResponse> = {}): HttpResponse => ({
    status: (error && error.status) || HttpStatusCodes.InternalServerError,
    body: { error: error.message },
    headers: {},
    ...overrides,
  });
}
