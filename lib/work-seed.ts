import type {EntryInput} from './model';
export const PROJECT_TREE:[string,string,string?][]=[];
export const projectSeedId=(owner:string,key:string)=>`${owner}:project:${key}`;
export function projectSeeds(_owner:string):EntryInput[]{return [];}
export const LEGACY_TASK_META:Record<string,{project:string;legacyTags:string[];engineeringStage:string}>={};
