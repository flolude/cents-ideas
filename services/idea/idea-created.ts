import {DomainEvent} from '@centsideas/event-sourcing2';
import {IdeaId, UserId, ISODate} from '@centsideas/types';

interface IdeaCreatedData {
  id: string;
  userId: string;
  createdAt: string;
}

export class IdeaCreated implements DomainEvent {
  // TODO how to enforce events to have thos properties when typescript cant handle abstract static props?
  static readonly eventName = 'idea.created';

  constructor(
    public readonly id: IdeaId,
    public readonly userId: UserId,
    public readonly createdAt: ISODate,
  ) {}

  serialize(): IdeaCreatedData {
    return {
      id: this.id.toString(),
      userId: this.userId.toString(),
      createdAt: this.createdAt.toString(),
    };
  }

  static deserialize({id, userId, createdAt}: IdeaCreatedData) {
    return new IdeaCreated(
      IdeaId.fromString(id),
      UserId.fromString(userId),
      ISODate.fromString(createdAt),
    );
  }
}