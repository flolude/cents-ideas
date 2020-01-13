import { EventEntity, ISnapshot } from '@cents-ideas/event-sourcing';
import { IUserState, ILoginState } from '@cents-ideas/models';

import { loginCommitFunctions } from './events';

// TODO i am not sure if i event need login entity anymore
export class Login extends EventEntity<ILoginState> {
  static initialState: ILoginState = {
    id: '',
    email: '',
    createdAt: null,
    lastEventId: '',
  };

  constructor(snapshot?: ISnapshot<IUserState>) {
    super(loginCommitFunctions, (snapshot && snapshot.state) || Login.initialState);
    if (snapshot) {
      this.lastPersistedEventId = snapshot.lastEventId;
    }
  }
}