const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'audit-agent-frontend',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createCurrentUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCurrentUser');
}
createCurrentUserRef.operationName = 'CreateCurrentUser';
exports.createCurrentUserRef = createCurrentUserRef;

exports.createCurrentUser = function createCurrentUser(dc) {
  return executeMutation(createCurrentUserRef(dc));
};

const getCurrentUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCurrentUser');
}
getCurrentUserRef.operationName = 'GetCurrentUser';
exports.getCurrentUserRef = getCurrentUserRef;

exports.getCurrentUser = function getCurrentUser(dc) {
  return executeQuery(getCurrentUserRef(dc));
};

const createDailyEntryRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateDailyEntry');
}
createDailyEntryRef.operationName = 'CreateDailyEntry';
exports.createDailyEntryRef = createDailyEntryRef;

exports.createDailyEntry = function createDailyEntry(dc) {
  return executeMutation(createDailyEntryRef(dc));
};

const listDailyEntriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDailyEntries');
}
listDailyEntriesRef.operationName = 'ListDailyEntries';
exports.listDailyEntriesRef = listDailyEntriesRef;

exports.listDailyEntries = function listDailyEntries(dc) {
  return executeQuery(listDailyEntriesRef(dc));
};
