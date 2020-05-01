const debug = require('debug')('plugin_pcr_guild');
const fs = require('fs');
const Path = require('path');
const touch = require("touch");
const Mirai = require('node-mirai-sdk');
const {Plain, At} = Mirai.MessageComponent;
const Plugin = require('../plugin');
const Utils = require('../../lib/utils');

const configpath = './data/guilds.json';

class PCRGuild extends Plugin {
    constructor(params) {
        super(params);
        touch(configpath);
        this.menu = [
            '可用公会战指令：\n', 'BOSS战况\n', 'BOSS预约 编号\n', 'BOSS申请出刀\n', 'BOSS强制出刀\n', 'BOSS报刀 伤害\n', 'BOSS挂树\n\n'
        ];
        this.opmenu = [
            '可用公会战管理指令：\n', '创建公会\n', '绑定公会\n', 'BOSS列表\n', '设置当前BOSS\n', '更新BOSS 123 x 123 x 123 (x为不更新)\n'
        ]
    }

    init() {
        this.qqbot.onMessage(async (message) => {
            debug(message);
            let msg_type = message.type, chat_id, group_id, permission = message.sender.permission;
            if (msg_type === 'GroupMessage') {
                chat_id = message.sender.group.id;
                group_id = chat_id;
                let linked_id = this.getLinkedIDByGroupID(group_id);

                Plugin.onText(/公会战指令/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let menu = this.menu.map(m => Plain(m));
                    if (linked_id) {
                        this.tgbot.sendMessage(linked_id, this.menu.join('\n')).catch(console.error)
                    }
                    return this.qqbot.sendGroupMessage(menu, chat_id)
                });

                Plugin.onText(/公会战管理指令/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let menu = this.opmenu.map(m => Plain(m));
                    if (linked_id) {
                        this.tgbot.sendMessage(linked_id, this.opmenu.join('\n')).catch(console.error)
                    }
                    return this.qqbot.sendGroupMessage(menu, chat_id)
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])战况/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let current_boss = this.getGuildCurrentBoss(guild_id);
                    if (!current_boss) {
                        current_boss = this.setGuildCurrentBossById(guild_id, 1);
                    }
                    let reply = [];
                    reply.push('进度：BOSS (' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
                    reply.push('当前出刀者:\n' + (current_boss.attacker_list.length > 0 ? current_boss.attacker_list.map(a => a.name).join(', ') : '无'));
                    reply.push('当前挂树者:\n' + (current_boss.tree_list.length > 0 ? current_boss.tree_list.map(a => a.name).join(', ') : '无'));
                    if (linked_id) {
                        this.tgbot.sendMessage(linked_id, reply.join('\n')).catch(console.error)
                    }
                    return this.qqbot.sendGroupMessage([Plain(reply.join('\n'))], chat_id)
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])预约(?: )?(?<boss_id>\d+)?/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let name = message.sender.memberName;
                    let id = message.sender.id;
                    let boss_id = match.groups.boss_id;
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    if (!boss_id) {
                        return this.qqbot.sendGroupMessage([Plain('需要BOSS Id')], chat_id)
                    }
                    let boss = this.getGuildSetting(guild_id, 'boss');
                    if (boss[boss_id]) {
                        this.updateBookingList(guild_id, id, name, parseInt(boss_id));
                        if (linked_id) {
                            this.tgbot.sendMessage(linked_id, 'BOSS(' + boss_id + ')预约完毕').catch(console.error)
                        }
                        return this.qqbot.sendGroupMessage([Plain('BOSS(' + boss_id + ')预约完毕')], chat_id)
                    } else {
                        return this.qqbot.sendGroupMessage([Plain('BOSS(' + boss_id + ')不存在')], chat_id)
                    }
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])申请(?:出刀)?/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let name = message.sender.memberName;
                    let id = message.sender.id;
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let current_boss = this.getGuildCurrentBoss(guild_id);
                    if (current_boss) {
                        let reply = [];
                        let attacker_list = current_boss.attacker_list;
                        let tree_list = current_boss.tree_list;
                        if (attacker_list.length > 0) {
                            reply.push('当前出刀者: \n' + attacker_list.map(a => a.name).join(', '))
                        } else {
                            reply.push('申请成功，请出刀');
                            reply.push('BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
                            let tree = tree_list.find(t => t.id === id);
                            if (tree) {
                                tree_list = Utils.removeArrayItem(tree_list, tree);
                            }
                            attacker_list.push({id, name});
                            this.setGuildCurrentBoss(guild_id, current_boss)
                        }
                        if (linked_id) {
                            this.tgbot.sendMessage(linked_id, reply.join('\n')).catch(console.error)
                        }
                        return this.qqbot.sendGroupMessage([Plain(reply.join('\n'))], chat_id)
                    }
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])强制出刀/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let name = message.sender.memberName;
                    let id = message.sender.id;
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let current_boss = this.getGuildCurrentBoss(guild_id);
                    if (current_boss) {
                        let reply = [];
                        let attacker_list = current_boss.attacker_list;
                        let tree_list = current_boss.tree_list;
                        reply.push('申请成功，请出刀');
                        reply.push('BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
                        let tree = tree_list.find(t => t.id === id);
                        if (tree) {
                            tree_list = Utils.removeArrayItem(tree_list, tree);
                        }
                        if (!attacker_list.includes(a => a.id === id)) {
                            attacker_list.push({id, name});
                        }
                        this.setGuildCurrentBoss(guild_id, current_boss);
                        if (linked_id) {
                            this.tgbot.sendMessage(linked_id, reply.join('\n')).catch(console.error)
                        }
                        return this.qqbot.sendGroupMessage([Plain(reply.join('\n'))], chat_id)
                    }
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])报刀(?: )?(?<hp>\d+)(?<unit>w|W|万)?/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let name = message.sender.memberName;
                    let id = message.sender.id;
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let current_boss = this.getGuildCurrentBoss(guild_id);
                    if (current_boss) {
                        let reply = [];
                        let attacker_list = current_boss.attacker_list;
                        let tree_list = current_boss.tree_list;
                        let attacker = attacker_list.find(a => a.id === id);
                        if (!attacker) {
                            return this.qqbot.sendGroupMessage([Plain('请先申请出刀')], chat_id)
                        } else {
                            attacker_list = Utils.removeArrayItem(attacker_list, attacker);
                            let hp = match.groups.hp;
                            let unit = match.groups.unit;
                            if (!hp) {
                                return this.qqbot.sendGroupMessage([Plain('需要HP')], chat_id)
                            }
                            if (unit) {
                                hp = hp * 10000;
                            }
                            current_boss.hp = current_boss.hp - hp;
                            if (current_boss.hp > 0) {
                                this.setGuildCurrentBoss(guild_id, current_boss);
                                if (linked_id) {
                                    this.tgbot.sendMessage(linked_id, '进度：BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp).catch(console.error)
                                }
                                return this.qqbot.sendGroupMessage([Plain('进度：BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp)], chat_id)
                            } else {
                                // 打屎了
                                let next_id = current_boss.id + 1;//, round = parseInt(next_id / 5) + 1;
                                next_id >= 6 ? next_id = 1 : next_id;
                                let booking_list = this.getGuildSetting(guild_id, 'booking_list');
                                reply.push(Plain('当前BOSS已死，可下树玩家：\n'));
                                tree_list.map(t => reply.push(At(t.id)));
                                current_boss = this.setGuildCurrentBossById(guild_id, next_id);
                                reply.push(Plain('\nBOSS(' + current_boss.id + ') MaxHP: ' + current_boss.max_hp + ' 已开启，预订提醒：\n'));
                                for (let book of booking_list) {
                                    if (book.boss_id === next_id) {
                                        reply.push(At(book.id));
                                        let index = booking_list.indexOf(book);
                                        delete booking_list[index];
                                    }
                                }
                                this.setGuildSetting(guild_id, 'booking_list', booking_list.filter(b => !!b));
                                if (linked_id) {
                                    this.tgbot.sendMessage(linked_id, reply.map(r => r.text || r.target).join('\n')).catch(console.error)
                                }
                                return this.qqbot.sendGroupMessage(reply, chat_id);
                            }
                        }
                    }
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])挂树/, message.messageChain, async (msg, match) => {
                    debug(match);
                    let name = message.sender.memberName;
                    let id = message.sender.id;
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let current_boss = this.getGuildCurrentBoss(guild_id);
                    if (current_boss) {
                        let reply = [];
                        let attacker_list = current_boss.attacker_list;
                        let tree_list = current_boss.tree_list;
                        let attacker = attacker_list.find(a => a.id === id);
                        if (attacker) {
                            attacker_list = Utils.removeArrayItem(attacker_list, attacker)
                        }
                        let tree = tree_list.find(t => t.id === id);
                        if (tree && !attacker) {
                            tree_list = Utils.removeArrayItem(tree_list, tree);
                            reply.push('已经在树上了')
                        } else {
                            if (!attacker) {
                                return this.qqbot.sendGroupMessage([Plain('未申请出刀')], chat_id)
                            }
                            tree_list.push({id, name});
                            reply.push('申请挂树成功')
                        }
                        this.setGuildCurrentBoss(guild_id, current_boss);
                        if (linked_id) {
                            this.tgbot.sendMessage(linked_id, reply.join('\n')).catch(console.error)
                        }
                        return this.qqbot.sendGroupMessage([Plain(reply.join('\n'))], chat_id)
                    }
                });

                Plugin.onText(/^创建公会(?: )?(.*)/, message.messageChain, async (msg, match) => {
                    debug(match);
                    if (!(permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                        return this.qqbot.sendGroupMessage([Plain('需要管理员')], chat_id)
                    }
                    if (match.length < 2 || !match[1]) {
                        return this.qqbot.sendGroupMessage([Plain('需要公会名')], chat_id)
                    } else {
                        let guild_name = match[1].trim();
                        let result = this.createGuild(guild_name);
                        this.setGroupSetting(group_id, 'guild_id', result.guild_id);
                        return this.qqbot.sendGroupMessage([Plain('公会['), Plain(result.guild_name), Plain(']创建成功并绑定本群, Id: '), Plain(result.guild_id)], chat_id)
                    }
                });

                Plugin.onText(/^绑定公会(?: )?(\d+)?/, message.messageChain, async (msg, match) => {
                    debug(match);
                    if (!(permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                        return this.qqbot.sendGroupMessage([Plain('需要管理员')], chat_id)
                    }
                    if (match.length < 2 || !match[1]) {
                        return this.qqbot.sendGroupMessage([Plain('需要公会id')], chat_id)
                    } else {
                        let guild_id = parseInt(match[1]);
                        let guild = this.getGuildName(guild_id);
                        if (!guild) {
                            return this.qqbot.sendGroupMessage([Plain('公会不存在')], chat_id)
                        }
                        this.setGroupSetting(group_id, 'guild_id', guild_id);
                        let guild_name = this.getGuildName(guild_id);
                        return this.qqbot.sendGroupMessage([Plain('公会['), Plain(guild_name), Plain(']('), Plain(guild_id), Plain(')绑定本群')], chat_id)
                    }
                });

                Plugin.onText(/(?:BOSS|boss)列表/, message.messageChain, async (msg, match) => {
                    debug(match);
                    if (!(permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                        return this.qqbot.sendGroupMessage([Plain('需要管理员')], chat_id)
                    }
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let boss = this.getGuildSetting(guild_id, 'boss');
                    boss = boss.map((b, i) => {
                        return 'BOSS(' + (i + 1) + ') MaxHP: ' + b;
                    });
                    if (boss.length === 0) {
                        boss = ['空']
                    }
                    return this.qqbot.sendGroupMessage([Plain(boss.join('\n'))], chat_id)
                });

                Plugin.onText(/^设置当前(?:BOSS|boss)(?: )?(?<boss_id>\d+)?/, message.messageChain, async (msg, match) => {
                    debug(match);
                    if (!(permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                        return this.qqbot.sendGroupMessage([Plain('需要管理员')], chat_id)
                    }
                    let boss_id = parseInt(match.groups.boss_id);
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    if (!boss_id) {
                        return this.qqbot.sendGroupMessage([Plain('需要BOSS Id')], chat_id)
                    }
                    let boss = this.getGuildSetting(guild_id, 'boss');
                    if (boss[boss_id - 1]) {
                        this.setGuildCurrentBossById(guild_id, boss_id);
                        return this.qqbot.sendGroupMessage([Plain('BOSS(' + boss_id + ')设置完毕, MaxHP: ' + boss[boss_id - 1])], chat_id)
                    } else {
                        return this.qqbot.sendGroupMessage([Plain('BOSS(' + boss_id + ')不存在')], chat_id)
                    }
                });

                Plugin.onText(/^更新(?:BOSS|boss)(?: )?(?<max_hp>.*)/, message.messageChain, async (msg, match) => {
                    debug(match);
                    if (!(permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                        return this.qqbot.sendGroupMessage([Plain('需要管理员')], chat_id)
                    }
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    let max_hp = match.groups.max_hp;
                    if (!max_hp) {
                        return this.qqbot.sendGroupMessage([Plain('需要参数')], chat_id)
                    }
                    max_hp = max_hp.trim().split(' ');
                    this.updateBossList(guild_id, max_hp);
                    let boss = this.getGuildSetting(guild_id, 'boss');
                    boss = boss.map((b, i) => {
                        return 'BOSS(' + (i + 1) + ') MaxHP: ' + b;
                    });
                    boss.splice(0, 0, '更新完成, 如需要请设置当前boss');
                    return this.qqbot.sendGroupMessage([Plain(boss.join('\n'))], chat_id)
                });
            }
        });

        this.tgbot.onText(/\/guild_boss_status(@\w+)?/, async (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            let group_id = this.getGroupIDByLinkedID(chat_id);
            let guild_id = this.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                return this.tgbot.sendMessage(chat_id, '未绑定公会')
            }
            let current_boss = this.getGuildCurrentBoss(guild_id);
            if (!current_boss) {
                current_boss = this.setGuildCurrentBossById(guild_id, 1);
            }
            let reply = [];
            reply.push('进度：BOSS (' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
            reply.push('当前出刀者:\n' + (current_boss.attacker_list.length > 0 ? current_boss.attacker_list.map(a => a.name).join(', ') : '无'));
            reply.push('当前挂树者:\n' + (current_boss.tree_list.length > 0 ? current_boss.tree_list.map(a => a.name).join(', ') : '无'));
            return this.tgbot.sendMessage(chat_id, reply.join('\n'))
        });
    }

    getGuildName(guild_id) {
        return this.getGuildSetting(guild_id, 'guild_name');
    }

    createGuild(guild_name) {
        let json = fs.readFileSync(configpath, 'utf8');
        let guilds = !!json ? JSON.parse(json) : [];
        let guild_id = guilds.filter(g => g.guild_id !== -1).length + 1;
        while (true) {
            let guild = guilds.find(a => a.guild_id.toString() === guild_id.toString());
            if (guild) {
                guild_id += 1;
            } else {
                break;
            }
        }
        let default_boss = [8000000, 12000000, 20000000, 40000000, 80000000];
        this.setGuildSetting(guild_id, 'guild_name', guild_name);
        this.setGuildSetting(guild_id, 'boss', default_boss);
        return {guild_id, guild_name}
    }

    updateBookingList(guild_id, id, name, boss_id) {
        let booking_list = this.getGuildSetting(guild_id, 'booking_list') || [];
        let book = booking_list.find(b => !!b && b.id === id && b.boss_id === boss_id);
        if (!book) {
            booking_list.push({id, name, boss_id})
        } else {
            booking_list = Utils.removeArrayItem(booking_list, book)
        }
        this.setGuildSetting(guild_id, 'booking_list', booking_list)
    }

    updateBossList(guild_id, boss) {
        let new_boss_list = [];
        let old_boss_list = this.getGuildSetting(guild_id, 'boss') || [];
        for (let i = 0; i < boss.length; i++) {
            let b = boss[i];
            if (b !== 'x') {
                b = parseInt(b);
                new_boss_list[i] = b;
            } else {
                new_boss_list[i] = old_boss_list[i] || 0;
            }
        }
        this.setGuildSetting(guild_id, 'boss', new_boss_list)
    }

    setGuildCurrentBossById(guild_id, boss_id) {
        let boss = this.getGuildSetting(guild_id, 'boss');
        let current_boss = {
            id: parseInt(boss_id),
            hp: boss[boss_id - 1],
            max_hp: boss[boss_id - 1],
            attacker_list: [],
            tree_list: []
        };
        this.setGuildSetting(guild_id, 'current_boss', current_boss);
        return current_boss
    }

    setGuildCurrentBoss(guild_id, boss) {
        return this.setGuildSetting(guild_id, 'current_boss', boss)
    }

    getGuildCurrentBoss(guild_id) {
        return this.getGuildSetting(guild_id, 'current_boss')
    }

    getGuildSetting(guild_id, key) {
        let json = fs.readFileSync(configpath, 'utf8');
        let guilds = !!json ? JSON.parse(json) : [];
        let guild = guilds.find(a => a.guild_id.toString() === guild_id.toString());
        if (!!guild) {
            return key ? guild[key] : guild;
        } else {
            return null;
        }
    }

    setGuildSetting(guild_id, key, value) {
        let json = fs.readFileSync(configpath, 'utf8');
        let guilds = !!json ? JSON.parse(json) : [];
        let guild = guilds.find(a => a.guild_id.toString() === guild_id.toString());
        if (!!guild) {
            debug('已存在，替换');
            let index = guilds.indexOf(guild);
            guilds[index][key] = value;
        } else {
            let obj = {guild_id};
            obj[key] = value;
            guilds.push(obj)
        }
        fs.writeFileSync(configpath, JSON.stringify(guilds))
    }
}

module.exports = PCRGuild;
