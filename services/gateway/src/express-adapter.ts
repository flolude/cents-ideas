import * as express from 'express';
import axios from 'axios';
import { injectable } from 'inversify';

import { HttpRequest, HttpResponse } from '@cents-ideas/models';
import { HttpStatusCodes } from '@cents-ideas/enums';
import { Logger } from '@cents-ideas/utils';

@injectable()
export class ExpressAdapter {
  constructor(private logger: Logger) {}

  public makeJsonAdapter = (url: string): express.RequestHandler => {
    return async (req: express.Request, res: express.Response) => {
      try {
        const httpRequest: HttpRequest = this.makeHttpRequestFromExpressRequest(req);
        this.logger.info(`${httpRequest.method} request to ${httpRequest.url}`);
        const response = await axios.post(url, httpRequest);
        const httpResponse: HttpResponse = response.data;
        this.handleExpressHttpResponse(res, httpResponse);
      } catch (err) {
        this.handleExpressHttpResponse(res, {
          status: HttpStatusCodes.InternalServerError,
          body: `Unexpected error occurred: ${err.message}`,
          headers: {},
        });
      }
    };
  };

  private handleExpressHttpResponse = (res: express.Response, httpResponse: HttpResponse): void => {
    if (httpResponse.headers) {
      res.set(httpResponse.headers);
    }
    res.status(httpResponse.status).send(httpResponse.body);
  };

  private makeHttpRequestFromExpressRequest = (expressRequest: express.Request): HttpRequest => {
    return {
      body: expressRequest.body,
      ip: expressRequest.ip,
      method: expressRequest.method,
      path: expressRequest.path,
      url: expressRequest.url,
      cookies: expressRequest.cookies,
      query: expressRequest.query,
      params: expressRequest.params,
      headers: expressRequest.headers,
    };
  };
}
