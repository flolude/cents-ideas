import { injectable } from 'inversify';
import * as faker from 'faker';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import * as queryString from 'query-string';

import {
  sendMail,
  decodeToken,
  TokenInvalidError,
  ThreadLogger,
  Identifier,
} from '@cents-ideas/utils';
import { ILoginTokenPayload, IRefreshTokenPayload } from '@cents-ideas/models';
import {
  TopLevelFrontendRoutes,
  AuthFrontendRoutes,
  QueryParamKeys,
  TokenExpirationTimes,
} from '@cents-ideas/enums';

import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { UserErrors } from './errors';
import env from './environment';
import { Login } from './login.entity';
import { LoginRepository } from './login.repository';
import { IGoogleUserinfo } from './models';

@injectable()
export class AuthCommandHandler {
  constructor(private userRepository: UserRepository, private loginRepository: LoginRepository) {}

  login = async (email: string, t: ThreadLogger): Promise<Login> => {
    UserErrors.EmailRequiredError.validate(email);
    UserErrors.EmailInvalidError.validate(email);
    t.debug('login with email', email);

    const emailUserMapping = await this.userRepository.getUserIdEmailMapping(email);
    const firstLogin = !emailUserMapping;
    const loginId = await this.loginRepository.generateUniqueId();
    t.debug(firstLogin ? 'first' : 'normal', 'login with loginId:', loginId);

    const tokenData: ILoginTokenPayload = { loginId, email, firstLogin };
    const token = jwt.sign(tokenData, env.loginTokenSecret, {
      expiresIn: TokenExpirationTimes.LoginToken,
    });

    t.debug('sendng login mail to ', email);
    const activationRoute: string = `${env.frontendUrl}/${TopLevelFrontendRoutes.Auth}/${AuthFrontendRoutes.Login}?${QueryParamKeys.Token}=${token}`;
    const expirationTimeHours = Math.floor(TokenExpirationTimes.LoginToken / 3600);
    const text = `URL to login into your account: ${activationRoute} (URL will expire after ${expirationTimeHours} hours)`;
    const subject = 'CENTS Ideas Login';
    // FIXME consider outsourcing sending mails into its own mailing service, which listens for event like LoginRequested
    await sendMail(env.mailing.fromAddress, email, subject, text, text, env.mailing.apiKey);
    t.debug('sent login confirmation email to', email);

    const login = Login.create(loginId, email, firstLogin);
    t.debug('start saving newly created login with id:', loginId);
    return this.loginRepository.save(login);
  };

  confirmLogin = async (token: string, t: ThreadLogger) => {
    const data = decodeToken(token, env.loginTokenSecret);
    t.debug('confirming login of token', token ? token.slice(0, 30) : token);

    const payload: ILoginTokenPayload = data;
    const login = await this.loginRepository.findById(payload.loginId);
    if (!login) throw new UserErrors.LoginNotFoundError(payload.loginId);
    t.debug('found login', login.persistedState.id);

    if (login && login.persistedState.confirmedAt)
      throw new TokenInvalidError(token, `This login was already confirmed`);

    if (payload.firstLogin && payload.loginId) {
      const createdUser = await this.handleUserCreation(payload.email, t);
      // TODO set some flag or do something when first login (so that client knows it) NOOO!!! we can handle this in frontend only
      return this.handleConfirmedLogin(createdUser, login, t);
    }

    const emailUserMapping = await this.userRepository.getUserIdEmailMapping(payload.email);
    if (!emailUserMapping) throw new UserErrors.NoUserWithEmailError(payload.email);

    const user = await this.userRepository.findById(emailUserMapping.userId);
    if (!user) throw new TokenInvalidError(token, 'invalid userId');

    return this.handleConfirmedLogin(user, login, t);
  };

  googleLoginRedirect = (origin?: string) => {
    const params = queryString.stringify({
      client_id: env.google.clientId,
      redirect_uri: this.getGoogleRedirectUri(origin),
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  googleLogin = async (code: string, t: ThreadLogger, origin?: string) => {
    const userInfo = await this.fetchGoogleUserInfo(code, t, origin);

    // FIXME send verification email manually
    if (!userInfo.verified_email)
      throw new Error('Please verify your Google email before signing in with Google');

    const existing = await this.userRepository.getGoogleUserIdMapping(userInfo.id);
    if (existing) {
      t.debug('found existing user with this google user id', existing.userId);

      const loginId = Identifier.makeLongId();
      const login = Login.createGoogleLogin(loginId, userInfo.email, false, userInfo.id);

      const user = await this.userRepository.findById(existing.userId);
      if (!user) throw new UserErrors.UserNotFoundError(existing.userId);

      if (user.persistedState.email !== userInfo.email) {
        t.debug(
          `user has a different email (${user.persistedState.email}) than it's google account (${userInfo.email})`,
        );
        // FIXME consider asking the user to change email
      }

      return this.handleConfirmedLogin(user, login, t);
    } else {
      UserErrors.EmailRequiredError.validate(userInfo.email);
      UserErrors.EmailInvalidError.validate(userInfo.email);

      const emailUserMapping = await this.userRepository.getUserIdEmailMapping(userInfo.email);
      if (emailUserMapping) {
        t.debug(
          'found a user that has the email of the google user but has not registered its account with the google account',
        );

        const specialLogin = Login.createGoogleLogin(
          Identifier.makeLongId(),
          userInfo.email,
          false,
          userInfo.id,
        );

        const user = await this.userRepository.findById(emailUserMapping.userId);
        if (!user)
          throw new Error(
            `user associated with email ${emailUserMapping.email} not found although it should exist`,
          );

        await this.userRepository.insertGoogleUserId(userInfo.id, user.persistedState.id);
        t.debug(`inserted new google user id mapping`);

        return this.handleConfirmedLogin(user, specialLogin, t);
      }
      t.debug('no exising google user id mapping found');

      const loginId = Identifier.makeLongId();
      const login = Login.createGoogleLogin(loginId, userInfo.email, true, userInfo.id);

      // TODO use method "handleUserCreation" for the user creation DRY!

      const userId = await this.userRepository.generateUniqueId();
      const refreshTokenId = Identifier.makeLongId();

      // FIXME set username based on google username
      const username: string = faker.internet.userName().toLowerCase().toString();
      await this.userRepository.checkUsernameAvailibility(username);
      t.debug(`username ${username} available`);

      let createdUser = User.create(userId, userInfo.email, username, refreshTokenId);

      // FIXME consider creating transaction and only apply if both succeeded? because its problematic if saving the user will fail after the userId has already bin inserted into the mapping collection
      await this.userRepository.insertGoogleUserId(userInfo.id, userId);
      await this.userRepository.insertEmail(userId, userInfo.email);
      await this.userRepository.insertUsername(userId, username);
      createdUser = await this.userRepository.save(createdUser);
      t.debug('created user with id', createdUser.persistedState.id);

      return this.handleConfirmedLogin(createdUser, login, t);
    }
  };

  refreshToken = async (token: string, t: ThreadLogger) => {
    const data: IRefreshTokenPayload = decodeToken(token, env.refreshTokenSecret);
    t.debug('refresh token is valid', token ? token.slice(0, 30) : token);

    const user = await this.userRepository.findById(data.userId);
    if (!user) throw new TokenInvalidError(token, 'invalid userId');

    if (user.persistedState.refreshTokenId !== data.tokenId)
      throw new TokenInvalidError(token, 'token was invalidated');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { accessToken, refreshToken, user };
  };

  revokeRefreshToken = async (userId: string, reason: string, t: ThreadLogger): Promise<User> => {
    UserErrors.UserIdRequiredError.validate(userId);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserErrors.UserNotFoundError(userId);
    t.debug(`found user for which to revoke refresh token`);

    const refreshTokenId = Identifier.makeLongId();
    user.revokeRefreshToken(refreshTokenId, reason);

    // FIXME maybe send email to user
    return this.userRepository.save(user);
  };

  private handleUserCreation = async (email: string, t: ThreadLogger): Promise<User> => {
    UserErrors.EmailRequiredError.validate(email);
    UserErrors.EmailInvalidError.validate(email);

    await this.userRepository.checkEmailAvailability(email);

    const username: string = faker.internet.userName().toLowerCase().toString();
    await this.userRepository.checkUsernameAvailibility(username);
    t.debug(`username ${username} available`);

    const userId = await this.userRepository.generateUniqueId();
    const tokenId = Identifier.makeLongId();
    const user = User.create(userId, email, username, tokenId);

    // FIXME somehow make sure all three succeed to complte the user creation
    await this.userRepository.insertUsername(userId, username);
    await this.userRepository.insertEmail(userId, email);
    return this.userRepository.save(user);
  };

  private handleConfirmedLogin = async (user: User, login: Login, t: ThreadLogger) => {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    t.debug('generated access and refresh tokens');

    login.confirmLogin(login.currentState.id, user.persistedState.id);
    await this.loginRepository.save(login);
    t.debug('confirmed login', login.persistedState.id);

    return { user: user.persistedState, accessToken, refreshToken };
  };

  private generateAccessToken = (user: User) => {
    return jwt.sign({ userId: user.persistedState.id }, env.accessTokenSecret, {
      expiresIn: TokenExpirationTimes.AccessToken,
    });
  };

  private generateRefreshToken = (user: User) => {
    return jwt.sign(
      {
        userId: user.persistedState.id,
        tokenId: user.persistedState.refreshTokenId,
      },
      env.refreshTokenSecret,
      { expiresIn: TokenExpirationTimes.RefreshToken },
    );
  };

  private fetchGoogleUserInfo = async (
    code: string,
    t: ThreadLogger,
    origin?: string,
  ): Promise<IGoogleUserinfo> => {
    UserErrors.GoogleLoginCodeRequiredError.validate(code);

    const tokensResponse = await axios({
      url: `https://oauth2.googleapis.com/token`,
      method: 'post',
      data: {
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: this.getGoogleRedirectUri(origin),
        grant_type: 'authorization_code',
        code,
      },
    });
    const { access_token } = tokensResponse.data;
    if (!access_token) throw new Error('Google access token could not be acquired');
    t.debug('got google access token, starts with', access_token?.substr(0, 10));

    const userInfoResponse = await axios({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      method: 'get',
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const userInfo: IGoogleUserinfo = userInfoResponse.data;
    if (!userInfo || !userInfo.id || !userInfo.email)
      throw new Error('Google user info could not be acquire');
    t.debug('fetched google user info of', userInfo.email);

    return userInfo;
  };

  private getGoogleRedirectUri = (origin?: string) => {
    const frontendUrl = env.environment === 'dev' ? origin || env.frontendUrl : env.frontendUrl;
    return `${frontendUrl}/${TopLevelFrontendRoutes.Auth}/${AuthFrontendRoutes.Login}`;
  };
}