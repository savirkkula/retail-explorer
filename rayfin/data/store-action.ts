import { entity, authenticated, uuid, int, text, date, set } from '@microsoft/rayfin-core';

/** A follow-up raised from a store insight. `unitKey` and `propertyKey` match the semantic model's Unit Key and Property Key. */
@entity()
@authenticated('*')
export class StoreAction {
  @uuid() id!: string;
  @int() unitKey!: number;
  @int() propertyKey!: number;
  @text({ max: 40 }) unitCode!: string;
  @text({ max: 120 }) storeName!: string;
  @set('renewal', 'rent-review', 'market-vacant', 'performance-review')
  actionType!: 'renewal' | 'rent-review' | 'market-vacant' | 'performance-review';
  @set('open', 'in-progress', 'done', 'declined')
  status!: 'open' | 'in-progress' | 'done' | 'declined';
  @set('low', 'medium', 'high')
  priority!: 'low' | 'medium' | 'high';
  @text({ max: 200 }) title!: string;
  @text({ max: 500 }) triggerText!: string;
  @date({ optional: true }) dueDate?: Date;
  @text({ max: 254, optional: true }) assignee?: string;
  @text({ max: 128 }) authorId!: string;
  @text({ max: 254 }) authorEmail!: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
