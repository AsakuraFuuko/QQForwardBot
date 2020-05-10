const Database = require('better-sqlite3');
const appRoot = require('app-root-path');

class DBHelper {
    constructor(site = 'cn') {
        this.db = new Database(appRoot + '/plugins/pcr/db/redive_' + site + '.db', {verbose: console.log});
    }

    getUnitEquip(unit_id) {
        const stmt = this.db.prepare('SELECT * FROM unit_promotion WHERE unit_id= ? ORDER BY promotion_level ASC');
        return stmt.all(unit_id);
    }

    getEquipInfo(equip_id) {
        const stmt = this.db.prepare('SELECT * FROM equipment_data WHERE equipment_id= ? ');
        return stmt.get(equip_id);
    }

    getEquipCraft(equip_id) {
        const stmt = this.db.prepare('SELECT * FROM equipment_craft WHERE equipment_id= ? ');
        return stmt.get(equip_id);
    }

    getUnits(star = [1, 2, 3]) {
        const stmt = this.db.prepare('SELECT * FROM unit_data WHERE comment <> \'\' AND rarity in (' + star.join(',') + ')');
        return stmt.all();
    }

    getUnitById(unit_id) {
        const stmt = this.db.prepare('SELECT * FROM unit_data WHERE unit_id= ? ');
        return stmt.get(unit_id);
    }
}

module.exports = DBHelper;
