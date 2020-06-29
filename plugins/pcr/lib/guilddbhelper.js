const DB = require('better-sqlite3-helper');
const appRoot = require('app-root-path');
const Utils = require('../../../lib/utils');

class GuildDBHelper {
    constructor() {
        DB({
            path: appRoot + '/data/guild.db',
            readonly: false, // read only
            fileMustExist: false, // throw error if database not exists
            WAL: true, // automatically enable 'PRAGMA journal_mode = WAL'
            migrate: {  // disable completely by setting `migrate: false`
                force: false, // set to 'last' to automatically reapply the last migration-file
                table: 'migration', // name of the database table that is used to keep track
                migrationsPath: appRoot + '/plugins/pcr/migrations' // path of the migration-files
            }
        });
    }

    addBossDamage(guild_id, user_name, user_id, boss_id, round, damage, current_hp, max_hp) {
        DB().insert('damages', [{
            guild_id, user_name, user_id, boss_id, round, damage, current_hp, max_hp, time: Utils.getUnixTimestamp()
        }])
    }

    reset(guild_id) {
        DB().delete('damages', {guild_id})
    }
}

module.exports = new GuildDBHelper();
