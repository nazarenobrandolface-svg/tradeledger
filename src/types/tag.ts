export type TagCategory = 'setup' | 'mistake' | 'emotion' | 'custom';

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: TagCategory;
  createdAt: number;
}

export interface TradeTag {
  tradeId: string;
  tagId: string;
}
