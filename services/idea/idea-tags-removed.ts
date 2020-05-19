import {DomainEvent} from '@centsideas/event-sourcing2';
import {IdeaId} from '@centsideas/types';

import {IdeaTags} from './idea-tags';

interface IdeaTagsRemovedData {
  id: string;
  tags: string[];
}

export class IdeaTagsRemoved implements DomainEvent {
  static readonly eventName = 'idea.tags-removed';

  constructor(public readonly id: IdeaId, public readonly tags: IdeaTags) {}

  // TODO would be awesome to do this with protobuf
  serialize(): IdeaTagsRemovedData {
    return {
      id: this.id.toString(),
      tags: this.tags.toArray(),
    };
  }

  static deserialize({id, tags}: IdeaTagsRemovedData) {
    return new IdeaTagsRemoved(IdeaId.fromString(id), IdeaTags.fromArray(tags));
  }
}