const debug = require('debug')('plugin_pcr_tools');
const fs = require('fs');
const Path = require('path');
const Mirai = require('node-mirai-sdk');
const {Image} = Mirai.MessageComponent;
const Plugin = require('../plugin');
const Utils = require('../../lib/utils');
const DBHelper = require('../pcr/lib/dbhelper');

class PCRTools extends Plugin {
    constructor(params) {
        super(params);
        this.pool = require('./pool_cn').pool;
    }

    init() {
        this.qqbot.onMessage(async (message) => {
            debug(message);
            let msg_type = message.type, chat_id;
            if (msg_type === 'GroupMessage') {
                chat_id = message.sender.group.id;
            } else {
                chat_id = message.sender.id
            }

            Plugin.onText(/boomcr(:?10|十)[连|連]/, message, async (msg, match) => {
                debug(match);
            });
        });

        this.tgbot.onText(/\/test(@\w+)?/, async (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            let equips = [], lv = 3;
            let result = DBHelper.getUnitEquip('100201');
            for (let level of result) {
                console.log(level);
                if (level.promotion_level > lv) {
                    continue
                }
                let ids = [level.equip_slot_1, level.equip_slot_2, level.equip_slot_3, level.equip_slot_4, level.equip_slot_5, level.equip_slot_6];
                for (let id of ids) {
                    this.getEquipInfo(id, equips);
                }
            }
            let cost = 0, r = [];
            r = equips.map(e => {
                cost += e.cost;
                return e.id + ', ' + e.name + 'x' + e.num;
            });
            return this.tgbot.sendMessage(chat_id, 'lv1->' + lv + '\n花费Mana: ' + cost + '\n' + r.join('\n'))
        });
    }

    getEquipInfo(equip_id, equips, cost = 0) {
        let r = DBHelper.getEquipInfo(equip_id);
        if (!r) return;
        if (r.craft_flg === 1) {
            let c = DBHelper.getEquipCraft(equip_id);
            for (let i = 1; i <= 10; i++) {
                if (c['consume_num_' + i] !== 0) {
                    let id = c['condition_equipment_id_' + i], num = c['consume_num_' + i];
                    this.getEquipInfo(id, equips, c.crafted_cost);
                }
            }
        } else {
            if (equips.some(e => e.id === r.equipment_id)) {
                let equip = equips.find(e => e.id === r.equipment_id);
                equip.num += 1;
            } else {
                equips.push({id: r.equipment_id, name: r.equipment_name, num: 1, cost})
            }
        }
    }
}

module.exports = PCRTools;
