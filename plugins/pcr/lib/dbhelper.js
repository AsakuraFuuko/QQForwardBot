const Database = require('better-sqlite3');

class DBHelper {
    constructor() {
        this.db = new Database('./plugins/pcr/db/redive_cn.db', {verbose: console.log});
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
}

module.exports = new DBHelper();
