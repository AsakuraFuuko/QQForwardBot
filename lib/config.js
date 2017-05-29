'use strict';
let yaml = require('js-yaml');
let fs = require('fs');

let configfile = '/config.yaml';
let configpath = process.env.CONFIGPATH || '.';

let path = configpath + configfile;
if (!fs.existsSync(path)) path = __dirname + '/config.yaml';

if (!fs.existsSync(path)) {
    console.log(`config.yaml not found at ${configpath} or ${__dirname}`);
    process.exit(0);
}

let config = fs.readFileSync(path, 'utf8');

module.exports = yaml.load(config);