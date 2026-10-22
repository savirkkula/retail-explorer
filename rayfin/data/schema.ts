import { StoreAction } from './store-action.js';
import { ActionComment } from './action-comment.js';

export type DataAppSchema = {
  StoreAction: StoreAction;
  ActionComment: ActionComment;
};

export const schema = [StoreAction, ActionComment];
