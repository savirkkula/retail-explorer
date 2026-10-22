import { entity, authenticated, uuid, text, date, one } from '@microsoft/rayfin-core';
import { StoreAction } from './store-action.js';

@entity()
@authenticated('*')
export class ActionComment {
  @uuid() id!: string;
  @uuid() action_id!: string;
  @one(() => StoreAction, { optional: true }) action?: StoreAction;
  @text({ max: 1000 }) body!: string;
  @text({ max: 128 }) authorId!: string;
  @text({ max: 254 }) authorEmail!: string;
  @date() createdAt!: Date;
}
