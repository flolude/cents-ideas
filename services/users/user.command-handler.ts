import { injectable } from 'inversify';
import * as faker from 'faker';
import * as jwt from 'jsonwebtoken';

import { sanitizeHtml } from '@cents-ideas/utils';
import { ApiEndpoints, UsersApiRoutes } from '@cents-ideas/enums';
import { ILoginResponseDto, IConfirmSignUpResponseDto, IAuthenticatedDto, IAuthTokenData } from '@cents-ideas/models';

import { UserRepository } from './user.repository';
import { User } from './user.entity';
import {
  UserIdRequiredError,
  UsernameRequiredError,
  UsernameInvalidError,
  EmailRequiredError,
  EmailInvalidError,
  EmailAlreadySignedUpError,
} from './errors';
import env from './environment';
import { ISignUpTokenData } from './models';
import { TokenInvalidError } from './errors/token-invalid.error';

@injectable()
export class UserCommandHandler {
  constructor(private repository: UserRepository) {}

  login = async (email: string): Promise<ILoginResponseDto> => {
    EmailRequiredError.validate(email);
    EmailInvalidError.validate(email);
    const existing = await this.repository.getUserIdEmailMapping(email);
    // FIXME instead of returning url send email with link
    if (existing && existing.userId) {
      const token = this.createAuthToken(existing.userId);
      return {
        existingAccount: true,
        activationRoute: `/${ApiEndpoints.Users}/${UsersApiRoutes.Authenticate}`,
        token,
      };
    } else {
      const data: ISignUpTokenData = { email };
      const token = jwt.sign(data, env.jwtSecret, { expiresIn: '1h' });
      return {
        existingAccount: false,
        activationRoute: `/${ApiEndpoints.Users}/${UsersApiRoutes.ConfirmSignUp}`,
        token,
      };
    }
  };

  confirmSignUp = async (token: string): Promise<IConfirmSignUpResponseDto> => {
    let decoded: any;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw new TokenInvalidError(token);
    }
    const email: string = decoded.email;
    EmailRequiredError.validate(email);
    EmailInvalidError.validate(email);
    const emailUserMapping = await this.repository.getUserIdEmailMapping(email);
    if (emailUserMapping) {
      throw new EmailAlreadySignedUpError(email);
    }
    const userId = await this.repository.generateUniqueId();
    const username: string = faker.internet
      .userName()
      .toLowerCase()
      .toString();
    // FIXME check if username is unique (same stuff as with email)
    const user = User.create(userId, email, username);
    // FIXME remove email if something went wrong with creating user
    await this.repository.insertEmail(userId, email);
    const updatedUser: User = await this.repository.save(user);
    const authToken = this.createAuthToken(userId);
    return { user: updatedUser.persistedState, token: authToken };
  };

  authenticate = async (token: string): Promise<IAuthenticatedDto> => {
    let decoded: any;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw new TokenInvalidError(token);
    }

    const userId: string = decoded.userId;
    if (!userId) throw new TokenInvalidError(token, 'No userId in token payload');

    const user = await this.repository.findById(userId);
    if (!user) throw new TokenInvalidError(token, 'Invalid userId in token payload');

    const updatedToken = this.createAuthToken(userId);
    return { user: user.persistedState, token: updatedToken };
  };

  updateUser = async (userId: string, username: string, email: string): Promise<User> => {
    UserIdRequiredError.validate(userId);
    username = sanitizeHtml(username);
    UsernameRequiredError.validate(username);
    EmailRequiredError.validate(email);
    UsernameInvalidError.validate(username);
    EmailInvalidError.validate(email);
    const user = await this.repository.findById(userId);
    const pendingEmail = user.persistedState.email !== email ? email : null;
    if (pendingEmail) {
      // FIXME check if email already exists and return error if necessary
      // FIXME dispatch email change request (and also send sth to the client, so it knows that the request has been sent)
    }
    user.update(username, pendingEmail);
    return this.repository.save(user);
  };

  // FIXME confirm email change
  confirmEmailChange = () => {};

  private createAuthToken = (userId: string): string => {
    const data: IAuthTokenData = { userId };
    return jwt.sign(data, env.jwtSecret, { expiresIn: '7d' });
  };
}