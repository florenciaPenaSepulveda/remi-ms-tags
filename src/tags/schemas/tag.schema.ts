import { Schema } from 'redis-om';

export interface Tag {
  id: string;
  name: string;
}

export const tagSchema = new Schema('tag', {
  name: { type: 'string' },
});
