const zlib = require('zlib');
const fs = require('fs');
const requestPromise = require('request-promise');

async function update(server) {
    const version_url = 'https://redive.estertion.win/last_version_' + server + '.json';
    let last_version = await requestPromise.get(version_url);
    if (last_version) {
        last_version = JSON.parse(last_version);
        let version;
        try {
            version = JSON.parse(fs.readFileSync('./db/last_version_' + server + '.json').toString());
        } catch (e) {
            console.error(e)
        }
        if (version && last_version.TruthVersion <= version.TruthVersion) {
            return;
        }
    } else {
        return;
    }
    if (await download_db(server)) {
        console.log('update ' + server + ' db');
        fs.writeFileSync('./db/last_version_' + server + '.json', JSON.stringify(last_version));
    }
}

async function download_db(server) {
    const db_url = 'https://redive.estertion.win/db/redive_' + server + '.db.br';
    let db = await requestPromise.get({uri: db_url, encoding: null});
    if (db) {
        let decompress = zlib.brotliDecompressSync(db);
        fs.writeFileSync('./db/redive_' + server + '.db', decompress);
        return true;
    }
    return false;
}

(async () => {
    await update('cn');
    await update('jp');
    await update('tw');
})();

