let fs = require('fs');
let dbHelper = require('./lib/dbhelper');

let jp_units = new dbHelper('jp').getUnits();

let star_1 = [], star_2 = [], star_3 = [], limited_1 = [], limited_3 = [];
for (let unit of jp_units) {
    let tw_obj = new dbHelper('tw').getUnitById(unit.unit_id);
    let cn_obj = new dbHelper('cn').getUnitById(unit.unit_id);
    let obj = {id: unit.unit_id, star: unit.rarity, jp_name: unit.unit_name};
    if (tw_obj) {
        obj.tw_name = tw_obj.unit_name;
    }
    if (cn_obj) {
        obj.cn_name = cn_obj.unit_name;
    }
    if (unit.is_limited === 0) {
        switch (unit.rarity) {
            case 1:
                star_1.push(obj);
                break;
            case 2:
                star_2.push(obj);
                break;
            case 3:
                star_3.push(obj);
                break;
        }
    } else {
        switch (unit.rarity) {
            case 1:
                limited_1.push(obj);
                break;
            case 3:
                limited_3.push(obj);
                break;
        }
    }
}

let u = {star_1, star_2, star_3, limited_1, limited_3};
fs.writeFileSync('chapters.json', JSON.stringify(u, ' ', 2));
