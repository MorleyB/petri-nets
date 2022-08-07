'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Add/overwrite any additional settings here
// config.server.port = 8080;
config.mongo.uri = 'mongodb://127.0.0.1:27017/petri-nets?authSource=admin';
config.plugin.allowServerExecution = true;
config.requirejsPaths['jointjs'] = './node_modules/jointjs/dist/joint.min';
config.requirejsPaths['lodash'] = './node_modules/lodash/lodash.min'; // required by jointjs

validateConfig(config);
module.exports = config;
