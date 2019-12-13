import { EventEntity, ISnapshot } from '@cents-ideas/event-sourcing';
import { IReviewScores, IReviewState } from '@cents-ideas/models';

import { commitFunctions, ReviewCreatedEvent, ReviewUnpublishedEvent, ReviewUpdatedEvent } from './events';
import { ReviewNotFoundError } from './errors';
import { ReviewDraftSavedEvent } from './events/review-draft-saved.event';
import { ReviewPublishedEvent } from './events/review-published.event';

export class Review extends EventEntity<IReviewState> {
  static initialState: IReviewState = {
    id: '',
    ideaId: '',
    content: '',
    scores: {
      control: 0,
      entry: 0,
      need: 0,
      time: 0,
      scale: 0,
    },
    createdAt: null,
    published: false,
    publishedAt: null,
    unpublishedAt: null,
    updatedAt: null,
    lastEventId: '',
    draft: null,
  };

  constructor(snapshot?: ISnapshot<IReviewState>) {
    super(commitFunctions, (snapshot && snapshot.state) || Review.initialState, ReviewNotFoundError);
    if (snapshot) {
      this.lastPersistedEventId = snapshot.lastEventId;
    }
  }

  static create(reviewId: string, ideaId: string): Review {
    const review = new Review();
    review.pushEvents(new ReviewCreatedEvent(reviewId, ideaId));
    return review;
  }

  saveDraft(content?: string, scores?: IReviewScores) {
    this.pushEvents(new ReviewDraftSavedEvent(this.persistedState.id, content, scores));
    return this;
  }

  publish() {
    this.pushEvents(new ReviewPublishedEvent(this.persistedState.id));
    return this;
  }

  unpublish() {
    this.pushEvents(new ReviewUnpublishedEvent(this.persistedState.id));
    return this;
  }

  update(content?: string, scores?: IReviewScores) {
    this.pushEvents(new ReviewUpdatedEvent(this.persistedState.id, content, scores));
    return this;
  }
}