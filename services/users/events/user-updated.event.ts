import {Event} from '@centsideas/event-sourcing';
import {UserEvents} from '@centsideas/enums';
import {IUserUpdatedEvent, IUserState} from '@centsideas/models';

export class UserUpdatedEvent extends Event<IUserUpdatedEvent> {
  static readonly eventName: string = UserEvents.UserUpdated;

  constructor(userId: string, payload: IUserUpdatedEvent) {
    super(UserUpdatedEvent.eventName, payload, userId);
  }

  static commit(state: IUserState, event: UserUpdatedEvent): IUserState {
    state.username = event.data.username?.toLowerCase() || state.username;
    state.pendingEmail = event.data.pendingEmail || '';
    return state;
  }
}
