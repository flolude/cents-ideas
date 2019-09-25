import { Event } from '@cents-ideas/event-sourcing';

import { IIdeaState } from '../idea.entity';

export class IdeaDraftSavedEvent extends Event<{
  title?: string;
  description?: string;
}> {
  static readonly eventName: string = 'idea-draft-saved';

  constructor(ideaId: string, title?: string, description?: string) {
    super(IdeaDraftSavedEvent.eventName, { title, description }, ideaId);
  }

  static commit(state: IIdeaState, { data }: IdeaDraftSavedEvent): IIdeaState {
    const { title, description } = data;
    state.draft = {
      ...state.draft,
      title: title || (state.draft && state.draft.title) || '',
      description: description || (state.draft && state.draft.description) || '',
    };
    return state;
  }
}
