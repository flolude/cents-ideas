import { HttpStatusCodes } from '@cents-ideas/enums';

// TODO use one class for all "Usererror, reviewerror, etc"
export abstract class UserError extends Error {
  constructor(message: string, public status: HttpStatusCodes = HttpStatusCodes.InternalServerError) {
    super(message);
  }
}
