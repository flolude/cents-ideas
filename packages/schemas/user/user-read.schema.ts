import {UserModels} from '@centsideas/models';

export interface GetMe {
  id: string;
}

export interface GetById {
  id: string;
}

export interface GetUsers {}

export interface GetByEmail {
  email: string;
}

export interface GetByUsername {
  username: string;
}

export interface Service {
  getMe: (
    payload: GetMe,
  ) => Promise<{public: UserModels.UserView; private: UserModels.PrivateUserView}>;
  getById: (payload: GetById) => Promise<UserModels.UserView>;
  getByEmail: (payload: GetByEmail) => Promise<UserModels.PrivateUserView>;
  getByUsername: (payload: GetByUsername) => Promise<UserModels.UserView>;
  getAll: (payload: GetUsers) => Promise<{users: UserModels.UserView[]}>;
}
