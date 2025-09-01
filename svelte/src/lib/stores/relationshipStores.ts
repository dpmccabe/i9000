import {
  type Relationship,
  type RelationshipSettings,
  type TabResults,
} from '../../internal';
import { type Writable, writable } from '../tansuStore';

export const relationshipSettings: Writable<RelationshipSettings | undefined> =
  writable<RelationshipSettings | undefined>(undefined);

export const relationshipResults: Writable<TabResults<Relationship> | undefined> =
  writable<TabResults<Relationship> | undefined>(undefined);

export const nNewRelationships: Writable<number | undefined> =
  writable(undefined);
