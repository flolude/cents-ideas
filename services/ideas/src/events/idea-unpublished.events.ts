import { Event } from '@cents-ideas/event-sourcing';
import { Idea, IIdeaState } from '../idea.entity';

export class IdeaUnpublishedEvent extends Event<{}> {
  static readonly eventName = 'idea-unpublished';

  constructor(ideaId: string) {
    super(IdeaUnpublishedEvent.eventName, {}, ideaId);
  }

  static commit(state: IIdeaState, _event: IdeaUnpublishedEvent): IIdeaState {
    state.published = false;
    state.unpublishedAt = new Date().toISOString();
    return state;
  }
}
