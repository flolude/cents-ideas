import { injectable, unmanaged, decorate } from 'inversify';
import { MongoClient, Db, Collection } from 'mongodb';
import * as retry from 'async-retry';
import { EventEmitter } from 'events';

import { Identifier, renameObjectProperty } from '@cents-ideas/utils';

import { IEventEntity } from './event-entity';
import { ISnapshot } from './snapshot';
import { IEvent } from '.';

export interface IEntityConstructor<Entity> {
  new (snapshot?: ISnapshot): Entity;
}

decorate(injectable(), EventEmitter);

@injectable()
export abstract class EventRepository<Entity extends IEventEntity> extends EventEmitter {
  private client: MongoClient;
  private db: Db;
  private eventCollection: Collection;
  private snapshotCollection: Collection;
  private counterCollection: Collection;
  private namespace: string;
  private readonly minNumberOfEventsToCreateSnapshot = 5;

  constructor(@unmanaged() protected readonly _Entity: IEntityConstructor<Entity>) {
    super();
  }

  initialize = async (url: string, namespace: string) => {
    this.namespace = `store_${namespace}`;

    this.client = await retry(async () => {
      const connection = await MongoClient.connect(url, { w: 1, useNewUrlParser: true, useUnifiedTopology: true });
      return connection;
    });

    this.db = this.client.db(namespace);

    this.db.on('close', () => {
      this.emit('disconnect');
    });

    this.eventCollection = this.db.collection(`${namespace}_events`);
    this.snapshotCollection = this.db.collection(`${namespace}_snapshots`);
    this.counterCollection = this.db.collection(`${namespace}_counters`);

    await this.eventCollection.createIndexes([
      {
        key: { aggregateId: 1 },
        name: `${this.namespace}_aggregateId`,
      },
      {
        key: { aggregateId: 1, eventNumber: 1 },
        name: `${this.namespace}_aggregateId_eventNumber`,
        unique: true,
      },
      {
        key: { eventNumber: 1 },
        name: `${this.namespace}_eventNumber`,
        unique: true,
      },
    ]);

    await this.snapshotCollection.createIndexes([
      {
        key: { aggregateId: 1 },
        unique: true,
      },
    ]);

    try {
      await this.counterCollection.insertOne({ _id: 'events', seq: 0 });
    } catch (error) {
      if (error.code === 11000 && error.message.includes('_counters index: _id_ dup key')) {
        return;
      }
      throw error;
    }
  };

  save = async (entity: Entity) => {
    const streamId: string = entity.currentState.id;
    const lastPersistedEvent = await this.getLastEventOfStream(streamId);
    let eventNumber = (lastPersistedEvent && lastPersistedEvent.eventNumber) || 0;
    if (lastPersistedEvent && entity.lastPersistedEventId !== lastPersistedEvent.id) {
      // FIXME retry once (issue: command handler has to retry, not save)
      throw new Error('concurrency issue!');
    }

    let eventsToInsert: IEvent[] = entity.pendingEvents.map(event => {
      eventNumber = eventNumber + 1;
      return { ...event, eventNumber };
    });

    const appendedEvents = await Promise.all(eventsToInsert.map(event => this.appendEvent(event)));

    for (const event of appendedEvents) {
      if (event.eventNumber % this.minNumberOfEventsToCreateSnapshot === 0) {
        this.saveSnapshot(event.aggregateId);
      }
    }

    return entity.confirmEvents();
  };

  findById = async (id: string): Promise<Entity> => {
    const snapshot = await this.getSnapshot(id);

    const events: IEvent[] = await (snapshot ? this.getEventsAfterSnapshot(snapshot) : this.getEventStream(id));

    const entity = new this._Entity(snapshot);
    entity.pushEvents(...events);
    if (!entity.currentState.id) {
      throw entity.NotFoundError(id);
    }

    return entity.confirmEvents();
  };

  generateUniqueId = (): Promise<string> => {
    const checkAvailability = async (resolve: Function) => {
      const id = Identifier.makeUniqueId();
      const result = await this.eventCollection.findOne({ aggregateId: id });
      result ? checkAvailability(resolve) : resolve(id);
    };
    return new Promise(resolve => checkAvailability(resolve));
  };

  async getNextSequence(name: string) {
    const counter = await this.counterCollection.findOneAndUpdate(
      { _id: name },
      {
        $inc: { seq: 1 },
      },
      { returnOriginal: false },
    );

    return counter.value.seq;
  }

  private getLastEventOfStream = async (streamId: string): Promise<IEvent | null> => {
    const result = await this.eventCollection.find(
      {
        aggregateId: streamId,
      },
      {
        sort: { eventNumber: -1 },
        limit: 1,
      },
    );
    const event = (await result.toArray())[0];
    return event ? renameObjectProperty(event, '_id', 'id') : null;
  };

  private appendEvent = async (event: IEvent): Promise<IEvent> => {
    const seq = await this.getNextSequence('events');

    const payload = renameObjectProperty(event, 'id', '_id');
    const result = await this.eventCollection.insertOne({ ...payload, position: seq });
    return result.ops[0];
  };

  getSnapshot = async (streamId: string): Promise<ISnapshot | null> => {
    return this.snapshotCollection.findOne({ aggregateId: streamId });
  };

  private getEventStream = async (streamId: string, from: number = 1, to: number = 2 ** 31 - 1) => {
    const result = await this.eventCollection.find(
      {
        $and: [{ aggregateId: streamId }, { eventNumber: { $gte: from } }, { eventNumber: { $lte: to } }],
      },
      { sort: { eventNumber: 1 } },
    );
    const events = await result.toArray();
    return events.map(e => renameObjectProperty(e, '_id', 'id'));
  };

  private getEventsAfterSnapshot = async (snapshot: ISnapshot): Promise<IEvent[]> => {
    const streamId = snapshot.state.id;
    const lastEventId = snapshot.lastEventId;

    const lastEvent: IEvent = await this.eventCollection.findOne({ _id: lastEventId });
    const lastEventNumber = lastEvent.eventNumber;

    return this.getEventStream(streamId, lastEventNumber);
  };

  private saveSnapshot = async (streamId: string): Promise<boolean> => {
    const entity = await this.findById(streamId);
    const lastEvent = await this.getLastEventOfStream(streamId);
    if (!lastEvent) {
      return false;
    }
    this.snapshotCollection.updateOne(
      { aggregateId: streamId },
      { $set: { aggregateId: streamId, lastEventId: lastEvent.id, state: entity.persistedState } },
      { upsert: true },
    );
  };
}
