/// <reference path="../typings/tsd.d.ts" />
var client_1 = require('./client');
exports.Client = client_1.Client;
exports.ConnectionStatus = client_1.ConnectionStatus;
var resume_1 = require('./extensions/resume');
exports.resume = resume_1.resume;
var presence_batch_1 = require('./extensions/presence-batch');
exports.presenceBatch = presence_batch_1.presenceBatch;
