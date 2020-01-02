import { Event } from '@cents-ideas/event-sourcing';
import { IdeaEvents } from '@cents-ideas/enums';
import { IIdeaCreatedEvent, IIdeaState } from '@cents-ideas/models';

export class IdeaCreatedEvent extends Event<IIdeaCreatedEvent> {
  static readonly eventName: string = IdeaEvents.IdeaCreated;

  constructor(ideaId: string, userId: string) {
    super(IdeaCreatedEvent.eventName, { ideaId, userId }, ideaId);
  }

  static commit(state: IIdeaState, event: IdeaCreatedEvent): IIdeaState {
    state.id = event.aggregateId;
    state.userId = event.data.userId;
    state.createdAt = event.timestamp;
    state.deleted = false;
    state.published = false;
    return state;
  }
}
