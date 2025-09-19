import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'audit-agent-frontend',
  location: 'us-east4'
};

export const createCurrentUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCurrentUser');
}
createCurrentUserRef.operationName = 'CreateCurrentUser';

export function createCurrentUser(dc) {
  return executeMutation(createCurrentUserRef(dc));
}

export const getCurrentUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCurrentUser');
}
getCurrentUserRef.operationName = 'GetCurrentUser';

export function getCurrentUser(dc) {
  return executeQuery(getCurrentUserRef(dc));
}

export const createDailyEntryRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateDailyEntry');
}
createDailyEntryRef.operationName = 'CreateDailyEntry';

export function createDailyEntry(dc) {
  return executeMutation(createDailyEntryRef(dc));
}

export const listDailyEntriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDailyEntries');
}
listDailyEntriesRef.operationName = 'ListDailyEntries';

export function listDailyEntries(dc) {
  return executeQuery(listDailyEntriesRef(dc));
}

