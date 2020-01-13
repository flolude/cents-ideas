import { Event } from '@cents-ideas/event-sourcing';
import { IdeaEvents } from '@cents-ideas/enums';
import { IIdeaDraftCommittedEvent, IIdeaState } from '@cents-ideas/models';

export class IdeaDraftCommittedEvent extends Event<IIdeaDraftCommittedEvent> {
  static readonly eventName: string = IdeaEvents.IdeaDraftCommitted;

  constructor(ideaId: string) {
    super(IdeaDraftCommittedEvent.eventName, {}, ideaId);
  }

  static commit(state: IIdeaState, event: IdeaDraftCommittedEvent): IIdeaState {
    state.title = (state.draft && state.draft.title) || state.title;
    state.description = (state.draft && state.draft.description) || state.description;
    state.draft = null;
    state.updatedAt = event.timestamp;
    return state;
  }
}