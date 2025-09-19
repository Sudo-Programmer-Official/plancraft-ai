import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateCurrentUserData {
  user_insert: User_Key;
}

export interface CreateDailyEntryData {
  dailyEntry_insert: DailyEntry_Key;
}

export interface DailyEntry_Key {
  id: UUIDString;
  __typename?: 'DailyEntry_Key';
}

export interface GetCurrentUserData {
  user?: {
    id: UUIDString;
    uid: string;
    email?: string | null;
    displayName?: string | null;
    createdAt: TimestampString;
  } & User_Key;
}

export interface ListDailyEntriesData {
  dailyEntries: ({
    id: UUIDString;
    createdAt: TimestampString;
    entryDate: DateString;
    mood?: string | null;
    notes?: string | null;
  } & DailyEntry_Key)[];
}

export interface Task_Key {
  id: UUIDString;
  __typename?: 'Task_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface VoiceMemo_Key {
  id: UUIDString;
  __typename?: 'VoiceMemo_Key';
}

interface CreateCurrentUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateCurrentUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateCurrentUserData, undefined>;
  operationName: string;
}
export const createCurrentUserRef: CreateCurrentUserRef;

export function createCurrentUser(): MutationPromise<CreateCurrentUserData, undefined>;
export function createCurrentUser(dc: DataConnect): MutationPromise<CreateCurrentUserData, undefined>;

interface GetCurrentUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetCurrentUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetCurrentUserData, undefined>;
  operationName: string;
}
export const getCurrentUserRef: GetCurrentUserRef;

export function getCurrentUser(): QueryPromise<GetCurrentUserData, undefined>;
export function getCurrentUser(dc: DataConnect): QueryPromise<GetCurrentUserData, undefined>;

interface CreateDailyEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateDailyEntryData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateDailyEntryData, undefined>;
  operationName: string;
}
export const createDailyEntryRef: CreateDailyEntryRef;

export function createDailyEntry(): MutationPromise<CreateDailyEntryData, undefined>;
export function createDailyEntry(dc: DataConnect): MutationPromise<CreateDailyEntryData, undefined>;

interface ListDailyEntriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDailyEntriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListDailyEntriesData, undefined>;
  operationName: string;
}
export const listDailyEntriesRef: ListDailyEntriesRef;

export function listDailyEntries(): QueryPromise<ListDailyEntriesData, undefined>;
export function listDailyEntries(dc: DataConnect): QueryPromise<ListDailyEntriesData, undefined>;

