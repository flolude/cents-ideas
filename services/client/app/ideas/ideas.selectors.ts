import * as __ngrxStore from '@ngrx/store/store';
import * as __entityTypes from '@ngrx/entity';

import { createSelector } from '@ngrx/store';

import { IIdeaViewModel } from '@cents-ideas/models';

import { IIdeasFeatureReducerState } from './ideas.state';
import * as fromIdeas from './ideas.reducer';
import { UserSelectors } from '../user/user.selectors';
import { AppSelectors } from '../store/app.selectors';

const selectIdeasState = createSelector(
  AppSelectors.selectIdeasFeatureState,
  (state: IIdeasFeatureReducerState) => state.ideas,
);
const selectIdeas = createSelector(selectIdeasState, fromIdeas.selectAllIdeas);
const selectIdeaEntities = createSelector(selectIdeasState, fromIdeas.selectIdeaEntities);
const selectSelectedIdeaId = createSelector(AppSelectors.selectRouterState, router => {
  return router ? (router.state.params.id as string) : '';
});
const selectSelectedIdea = createSelector(
  selectSelectedIdeaId,
  selectIdeaEntities,
  (id: string, entities: Record<string, IIdeaViewModel>) => {
    return entities[id];
  },
);

const selectEditIdeaState = createSelector(
  AppSelectors.selectIdeasFeatureState,
  (state: IIdeasFeatureReducerState) => state.edit,
);
const selectIsCurrentUserOwner = createSelector(
  UserSelectors.selectUser,
  selectSelectedIdea,
  (user, idea) => (user && idea ? user.id === idea.userId : false),
);

export const IdeasSelectors = {
  selectIdeasState,
  selectIdeas,
  selectSelectedIdea,
  selectSelectedIdeaId,
  selectEditIdeaState,
  selectIsCurrentUserOwner,
};