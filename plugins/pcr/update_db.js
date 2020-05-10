const server = 'cn';
const version_url = 'https://redive.estertion.win/last_version_' + server + '.json';
const db_url = 'https://redive.estertion.win/db/redive_' + server + '.db.br';

const zlib = require('zlib');
const fs = require('fs');
const requestPromise = require('request-promise');

(async () => {
    let last_version_cn = await requestPromise.get(version_url);
    if (last_version_cn) {
        last_version_cn = JSON.parse(last_version_cn);
        let version_cn;
        try {
            version_cn = JSON.parse(fs.readFileSync('./db/last_version_' + server + '.json').toString());
        } catch (e) {
            console.error(e)
        }
        if (version_cn && last_version_cn.TruthVersion <= version_cn.TruthVersion) {
            return;
        }
    } else {
        return;
    }
    if (await download_db()) {
        console.log('update db');
        fs.writeFileSync('./db/last_version_' + server + '.json', JSON.stringify(last_version_cn));
    }
})();

async function download_db() {
    let db = await requestPromise.get({uri: db_url, encoding: null});
    if (db) {
        let decompress = zlib.brotliDecompressSync(db);
        fs.writeFileSync('./db/redive_' + server + '.db', decompress);
        return true;
    }
    return false;
}
