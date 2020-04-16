import { injectable } from 'inversify';

import { HttpStatusCodes, CookieNames, TokenExpirationTimes } from '@cents-ideas/enums';
import {
  HttpRequest,
  HttpResponse,
  ILoginDto,
  IUpdateUserDto,
  IUserQueryDto,
  IUserState,
  IConfirmEmailChangeDto,
  IConfirmLoginDto,
  Cookie,
  IConfirmedLoginDto,
  IRefreshedTokenDto,
  IGoogleLoginRedirectDto,
} from '@cents-ideas/models';
import { handleHttpResponseError, Logger } from '@cents-ideas/utils';

import { UserCommandHandler } from './user.command-handler';
import env from './environment';

@injectable()
export class UsersService {
  constructor(private commandHandler: UserCommandHandler) {}

  login = (req: HttpRequest<ILoginDto>): Promise<HttpResponse> =>
    // TODO do i need promises here... or can i just create an async function that returns a value (would be cleaner)
    new Promise(resolve => {
      Logger.thread('login', async t => {
        try {
          const createdLogin = await this.commandHandler.login(req.body.email, t);
          t.log('created login with id', createdLogin.persistedState.id);

          resolve({
            status: HttpStatusCodes.Accepted,
            body: {},
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  confirmLogin = (req: HttpRequest<IConfirmLoginDto>): Promise<HttpResponse<IConfirmedLoginDto>> =>
    new Promise(resolve => {
      Logger.thread('confirm login', async t => {
        try {
          const data = await this.commandHandler.confirmLogin(req.body.loginToken, t);
          const { user, accessToken, refreshToken } = data;
          const refreshTokenCookie = this.createRefreshTokenCookie(refreshToken);
          t.log('confirmed login of user', user.id);

          resolve({
            status: HttpStatusCodes.Accepted,
            body: { user, accessToken },
            cookies: [refreshTokenCookie],
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  googleLoginRedirect = (_req: HttpRequest): Promise<HttpResponse<IGoogleLoginRedirectDto>> =>
    new Promise(resolve => {
      Logger.thread('google login redirect', async t => {
        try {
          const url = this.commandHandler.googleLoginRedirect();
          t.debug('generated google login url starting with', url.substr(0, 30));
          resolve({
            status: HttpStatusCodes.Accepted,
            body: { url },
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  googleLogin = (req: HttpRequest): Promise<HttpResponse> =>
    new Promise(resolve => {
      Logger.thread('google login', async t => {
        try {
          const code: string = req.body.code;
          t.debug('code starts with', code.substr(0, 20));

          const data = await this.commandHandler.googleLogin(code, t);
          const { user, accessToken, refreshToken } = data;
          const refreshTokenCookie = this.createRefreshTokenCookie(refreshToken);
          t.log('successfully completed google login');

          resolve({
            status: HttpStatusCodes.Accepted,
            body: { user, accessToken },
            cookies: [refreshTokenCookie],
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  refreshToken = (req: HttpRequest): Promise<HttpResponse<IRefreshedTokenDto>> =>
    new Promise(resolve => {
      Logger.thread('refresh token', async t => {
        try {
          const currentRefreshToken =
            req.cookies[CookieNames.RefreshToken] || req.body.refreshToken;
          const data = await this.commandHandler.refreshToken(currentRefreshToken, t);
          const { user, accessToken, refreshToken } = data;
          const refreshTokenCookie = this.createRefreshTokenCookie(refreshToken);
          t.log(
            'generated new access token and refreshed refresh token of user',
            user.persistedState.id,
          );

          resolve({
            status: HttpStatusCodes.Accepted,
            body: { user: user.persistedState, accessToken },
            cookies: [refreshTokenCookie],
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  updateUser = (
    req: HttpRequest<IUpdateUserDto, IUserQueryDto>,
  ): Promise<HttpResponse<IUserState>> =>
    new Promise(resolve => {
      Logger.thread('update user', async t => {
        try {
          const updatedUser = await this.commandHandler.updateUser(
            req.locals.userId,
            req.params.id,
            req.body.username,
            req.body.email,
            t,
          );
          t.log('updated user');
          resolve({
            status: HttpStatusCodes.Accepted,
            body: updatedUser.persistedState,
            headers: {},
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  confirmEmailChange = (
    req: HttpRequest<IConfirmEmailChangeDto>,
  ): Promise<HttpResponse<IUserState>> =>
    new Promise(resolve => {
      Logger.thread('confirm email change', async t => {
        try {
          const updatedUser = await this.commandHandler.confirmEmailChange(req.body.token, t);
          t.log('confirmed email change');
          resolve({
            status: HttpStatusCodes.Accepted,
            body: updatedUser.persistedState,
            headers: {},
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  logout = (_req: HttpRequest): Promise<HttpResponse> =>
    new Promise(resolve => {
      Logger.thread('logout', async t => {
        try {
          resolve({
            status: HttpStatusCodes.Accepted,
            body: {},
            cookies: [new Cookie(CookieNames.RefreshToken, '', { maxAge: 0 })],
          });
        } catch (error) {
          t.error(error.status && error.status < 500 ? error.message : error.stack);
          resolve(handleHttpResponseError(error));
        }
      });
    });

  private createRefreshTokenCookie = (refreshToken: string) =>
    new Cookie(CookieNames.RefreshToken, refreshToken, {
      httpOnly: true,
      // TODO test if this works with subdomains (api.centsideas.com)? https://security.stackexchange.com/a/223477/232388
      sameSite: env.environment === 'dev' ? 'none' : 'strict',
      secure: env.environment === 'dev' ? false : true,
      maxAge: TokenExpirationTimes.RefreshToken * 1000,
    });
}
