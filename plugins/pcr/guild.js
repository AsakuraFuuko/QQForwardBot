const debug = require('debug')('plugin_pcr_guild');
const fs = require('fs');
const Path = require('path');
const touch = require("touch");
const moment = require('moment');
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
            '可用公会战指令：\n', 'BOSS战况 (缩写: !战况)\n', 'BOSS预约 编号 (缩写: !预约 编号)\n',
            'BOSS申请出刀 (缩写: !申请)\n', 'BOSS强制出刀 (缩写: !强制)\n', 'BOSS报刀 伤害 (缩写: !报刀 伤害)\n', 'BOSS挂树 (缩写: !挂树)'
        ];
        this.opmenu = [
            '可用公会战管理指令：\n', '创建公会\n', '绑定公会\n', 'BOSS列表\n', '设置当前BOSS\n',
            '更新BOSS 123 x 123 x 123 (x为不更新)\n', '更新当前BOSSHP 血量'
        ]
    }

    init() {
        let that = this;
        this.qqbot.onMessage(async (message) => {
            debug(message);
            let msg_type = message.type, chat_id, group_id, permission = message.sender.permission;
            if (msg_type === 'GroupMessage') {
                chat_id = message.sender.group.id;
                group_id = chat_id;
                let linked_id = this.getLinkedIDByGroupID(group_id);

                Plugin.onText(/公会战指令|^[!|！]指令/, message, async (msg, match) => {
                    debug(match);
                    let menu = this.menu.map(m => Plain(m));
                    if (linked_id) {
                        this.tgbot.sendMessage(linked_id, this.menu.join('')).catch(console.error)
                    }
                    return this.qqbot.sendGroupMessage(menu, chat_id)
                });

                Plugin.onText(/公会战管理指令|^[!|！]管理/, message, async (msg, match) => {
                    debug(match);
                    let menu = this.opmenu.map(m => Plain(m));
                    if (linked_id) {
                        this.tgbot.sendMessage(linked_id, this.opmenu.join('')).catch(console.error)
                    }
                    return this.qqbot.sendGroupMessage(menu, chat_id)
                });

                Plugin.onText(/(?:BOSS|boss|^[!|！])战况/, message, guild_boss_status);

                Plugin.onText(/(?:BOSS|boss|^[!|！])预约(?: )?(?<boss_id>\d+)?/, message, guild_boss_booking);

                Plugin.onText(/(?:BOSS|boss|^[!|！])申请(?:出刀)?/, message, guild_boss_request);

                Plugin.onText(/(?:BOSS|boss|^[!|！])强制(?:出刀)?/, message, guild_force_boss_request);

                Plugin.onText(/(?:BOSS|boss|^[!|！])报刀(?: )?(?<hp>\d+)(?<unit>w|W|万)?/, message, guild_boss_damage);

                Plugin.onText(/(?:BOSS|boss|^[!|！])挂树/, message, guild_boss_up_the_tree);

                Plugin.onText(/^创建公会(?: )?(.*)/, message, async (msg, match) => {
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

                Plugin.onText(/^绑定公会(?: )?(\d+)?/, message, async (msg, match) => {
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

                Plugin.onText(/(?:BOSS|boss)列表/, message, async (msg, match) => {
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

                Plugin.onText(/^设置当前(?:BOSS|boss)(?: )?(?<boss_id>\d+)?/, message, async (msg, match) => {
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

                Plugin.onText(/^更新当前(?:BOSS|boss)(?: )?HP(?: )?(?<boss_hp>\d+)?/, message, async (msg, match) => {
                    debug(match);
                    if (!(permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                        return this.qqbot.sendGroupMessage([Plain('需要管理员')], chat_id)
                    }
                    let boss_hp = parseInt(match.groups.boss_hp);
                    let guild_id = this.getGroupSetting(group_id, 'guild_id');
                    if (!guild_id) {
                        return this.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], chat_id)
                    }
                    if (!boss_hp) {
                        return this.qqbot.sendGroupMessage([Plain('需要BOSS HP')], chat_id)
                    }
                    let current_boss = this.getGuildCurrentBoss(guild_id);
                    if (current_boss) {
                        current_boss.hp = boss_hp;
                        that.setGuildCurrentBoss(guild_id, current_boss);
                        return this.qqbot.sendGroupMessage([Plain('当前BOSS(' + current_boss.id + ')更新完毕, HP: ' + current_boss.hp + '/' + current_boss.max_hp)], chat_id)
                    }
                });

                Plugin.onText(/^更新(?:BOSS|boss)(?: )?(?<max_hp>.*)/, message, async (msg, match) => {
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

        this.tgbot.onText(/(?:BOSS|boss|^[!|！])战况/, guild_boss_status);
        this.tgbot.onText(/(?:BOSS|boss|^[!|！])预约(?: )?(?<boss_id>\d+)?/, guild_boss_booking);
        this.tgbot.onText(/(?:BOSS|boss|^[!|！])申请(?:出刀)?/, guild_boss_request);
        this.tgbot.onText(/(?:BOSS|boss|^[!|！])强制出刀/, guild_force_boss_request);
        this.tgbot.onText(/(?:BOSS|boss|^[!|！])报刀(?: )?(?<hp>\d+)(?<unit>w|W|万)?/, guild_boss_damage);
        this.tgbot.onText(/(?:BOSS|boss|^[!|！])挂树/, guild_boss_up_the_tree);

        async function guild_boss_status(msg, match) {
            debug(match);
            let is_tg = !!msg.from;
            let user_id = is_tg ? msg.from.id : msg.sender.id;
            let user_name = is_tg ? ((msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name) : msg.sender.memberName;
            let group_id = is_tg ? that.getGroupIDByLinkedID(msg.chat.id) : msg.sender.group.id;
            let linked_id = is_tg ? msg.chat.id : that.getLinkedIDByGroupID(group_id);
            let at_qq = '', at_tg = '';
            if (is_tg) {
                at_tg = '<a href="tg://user?id=' + user_id + '">' + user_name + '</a>';
                at_qq = Plain(user_name)
            } else {
                at_tg = user_name;
                at_qq = At(user_id)
            }
            let guild_id = that.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, '请先创建或绑定一个公会', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], group_id)
                }
            }
            let current_boss = that.getGuildCurrentBoss(guild_id);
            if (!current_boss) {
                current_boss = that.setGuildCurrentBossById(guild_id, 1);
            }
            let reply = [];
            reply.push('进度：BOSS (' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
            reply.push('当前出刀者:\n' + (current_boss.attacker_list.length > 0 ? current_boss.attacker_list.map(a => a.name).join(', ') : '无'));
            reply.push('当前挂树者:\n' + (current_boss.tree_list.length > 0 ? current_boss.tree_list.map(a => a.name).join(', ') : '无'));
            if (linked_id) {
                that.tgbot.sendMessage(linked_id, at_tg + ' ' + reply.join('\n'), {parse_mode: 'HTML'}).catch(console.error)
            }
            return that.qqbot.sendGroupMessage([at_qq, Plain(reply.join('\n'))], group_id);
        }

        async function guild_boss_booking(msg, match) {
            debug(match);
            let is_tg = !!msg.from;
            let user_id = is_tg ? msg.from.id : msg.sender.id;
            let user_name = is_tg ? ((msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name) : msg.sender.memberName;
            let group_id = is_tg ? that.getGroupIDByLinkedID(msg.chat.id) : msg.sender.group.id;
            let linked_id = is_tg ? msg.chat.id : that.getLinkedIDByGroupID(group_id);
            let at_qq = '', at_tg = '';
            if (is_tg) {
                at_tg = '<a href="tg://user?id=' + user_id + '">' + user_name + '</a>';
                at_qq = Plain(user_name)
            } else {
                at_tg = user_name;
                at_qq = At(user_id)
            }
            let guild_id = that.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '请先创建或绑定一个公会', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([at_qq, Plain('请先创建或绑定一个公会')], group_id)
                }
            }
            let boss_id = match.groups.boss_id;
            if (!boss_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '需要BOSS Id', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([at_qq, Plain('需要BOSS Id')], group_id)
                }
            }
            let boss = that.getGuildSetting(guild_id, 'boss');
            if (boss[boss_id]) {
                let result = that.updateBookingList(guild_id, user_id, user_name, parseInt(boss_id), is_tg);
                that.log(`预约 - ${user_name} - ${user_id} - BOSS:${boss_id} ${(result ? '预约完毕' : '取消预约')}`);
                if (linked_id) {
                    that.tgbot.sendMessage(linked_id, at_tg + ' ' + 'BOSS(' + boss_id + ')' + (result ? '预约完毕' : '取消预约'), {parse_mode: 'HTML'}).catch(console.error)
                }
                return that.qqbot.sendGroupMessage([at_qq, Plain('BOSS(' + boss_id + ')' + (result ? '预约完毕' : '取消预约'))], group_id)
            } else {
                if (linked_id) {
                    that.tgbot.sendMessage(linked_id, at_tg + ' ' + 'BOSS(' + boss_id + ')不存在', {parse_mode: 'HTML'}).catch(console.error)
                }
                return that.qqbot.sendGroupMessage([at_qq, Plain('BOSS(' + boss_id + ')不存在')], group_id)
            }
        }

        async function guild_boss_request(msg, match) {
            debug(match);
            let is_tg = !!msg.from;
            let user_id = is_tg ? msg.from.id : msg.sender.id;
            let user_name = is_tg ? ((msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name) : msg.sender.memberName;
            let group_id = is_tg ? that.getGroupIDByLinkedID(msg.chat.id) : msg.sender.group.id;
            let linked_id = is_tg ? msg.chat.id : that.getLinkedIDByGroupID(group_id);
            let at_qq = '', at_tg = '';
            if (is_tg) {
                at_tg = '<a href="tg://user?id=' + user_id + '">' + user_name + '</a>';
                at_qq = Plain(user_name)
            } else {
                at_tg = user_name;
                at_qq = At(user_id)
            }
            let guild_id = that.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, '请先创建或绑定一个公会', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([Plain('请先创建或绑定一个公会')], group_id)
                }
            }
            let current_boss = that.getGuildCurrentBoss(guild_id);
            if (current_boss) {
                let reply = [];
                let attacker_list = current_boss.attacker_list;
                let tree_list = current_boss.tree_list;
                if (attacker_list.length > 0) {
                    reply.push('当前出刀者: \n' + attacker_list.map(a => a.name).join(', '))
                } else {
                    that.log(`申请 - ${user_name} - ${user_id} - BOSS:${current_boss.id} 申请成功`);
                    reply.push('申请成功，请出刀');
                    reply.push('BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
                    let tree = tree_list.find(t => t.id === user_id);
                    if (tree) {
                        tree_list = Utils.removeArrayItem(tree_list, tree);
                    }
                    attacker_list.push({id: user_id, name: user_name});
                    that.setGuildCurrentBoss(guild_id, current_boss)
                }
                if (linked_id) {
                    that.tgbot.sendMessage(linked_id, at_tg + ' ' + reply.join('\n'), {parse_mode: 'HTML'}).catch(console.error)
                }
                return that.qqbot.sendGroupMessage([at_qq, Plain(reply.join('\n'))], group_id)
            }
        }

        async function guild_force_boss_request(msg, match) {
            debug(match);
            let is_tg = !!msg.from;
            let user_id = is_tg ? msg.from.id : msg.sender.id;
            let user_name = is_tg ? ((msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name) : msg.sender.memberName;
            let group_id = is_tg ? that.getGroupIDByLinkedID(msg.chat.id) : msg.sender.group.id;
            let linked_id = is_tg ? msg.chat.id : that.getLinkedIDByGroupID(group_id);
            let at_qq = '', at_tg = '';
            if (is_tg) {
                at_tg = '<a href="tg://user?id=' + user_id + '">' + user_name + '</a>';
                at_qq = Plain(user_name)
            } else {
                at_tg = user_name;
                at_qq = At(user_id)
            }
            let guild_id = that.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '请先创建或绑定一个公会', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([at_qq, Plain('请先创建或绑定一个公会')], group_id)
                }
            }
            let current_boss = that.getGuildCurrentBoss(guild_id);
            if (current_boss) {
                let reply = [];
                let attacker_list = current_boss.attacker_list;
                let tree_list = current_boss.tree_list;
                that.log(`申请 - ${user_name} - ${user_id} - BOSS:${current_boss.id} 强制申请成功`);
                reply.push('申请成功，请出刀');
                reply.push('BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp);
                let tree = tree_list.find(t => t.id === user_name);
                if (tree) {
                    tree_list = Utils.removeArrayItem(tree_list, tree);
                }
                if (!attacker_list.includes(a => a.id === user_id)) {
                    attacker_list.push({id: user_id, name: user_name});
                }
                that.setGuildCurrentBoss(guild_id, current_boss);
                if (linked_id) {
                    that.tgbot.sendMessage(linked_id, at_tg + ' ' + reply.join('\n'), {parse_mode: 'HTML'}).catch(console.error)
                }
                return that.qqbot.sendGroupMessage([at_qq, Plain(reply.join('\n'))], group_id)
            }
        }

        async function guild_boss_damage(msg, match) {
            debug(match);
            let is_tg = !!msg.from;
            let user_id = is_tg ? msg.from.id : msg.sender.id;
            let user_name = is_tg ? ((msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name) : msg.sender.memberName;
            let group_id = is_tg ? that.getGroupIDByLinkedID(msg.chat.id) : msg.sender.group.id;
            let linked_id = is_tg ? msg.chat.id : that.getLinkedIDByGroupID(group_id);
            let at_qq = '', at_tg = '';
            if (is_tg) {
                at_tg = '<a href="tg://user?id=' + user_id + '">' + user_name + '</a>';
                at_qq = Plain(user_name)
            } else {
                at_tg = user_name;
                at_qq = At(user_id)
            }
            let guild_id = that.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '请先创建或绑定一个公会', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([at_qq, Plain('请先创建或绑定一个公会')], group_id)
                }
            }
            let current_boss = that.getGuildCurrentBoss(guild_id);
            if (current_boss) {
                let reply = [];
                let attacker_list = current_boss.attacker_list;
                let tree_list = current_boss.tree_list;
                let attacker = attacker_list.find(a => a.id === user_id);
                if (!attacker) {
                    if (is_tg) {
                        return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '请先申请出刀', {parse_mode: 'HTML'}) : null;
                    } else {
                        return that.qqbot.sendGroupMessage([at_qq, Plain('请先申请出刀')], guild_id)
                    }
                } else {
                    attacker_list = Utils.removeArrayItem(attacker_list, attacker);
                    let hp = match.groups.hp;
                    let unit = match.groups.unit;
                    if (!hp) {
                        if (is_tg) {
                            return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '需要HP', {parse_mode: 'HTML'}) : null;
                        } else {
                            return that.qqbot.sendGroupMessage([at_qq, Plain('需要HP')], group_id)
                        }
                    }
                    if (unit) {
                        hp = hp * 10000;
                    }
                    that.log(`出刀 - ${user_name} - ${user_id} - BOSS:${current_boss.id} ${hp} (${current_boss.hp}/${current_boss.max_hp})`);
                    current_boss.hp = current_boss.hp - hp;
                    if (current_boss.hp > 0) {
                        that.setGuildCurrentBoss(guild_id, current_boss);
                        if (linked_id) {
                            that.tgbot.sendMessage(linked_id, at_tg + ' 进度：BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp).catch(console.error)
                        }
                        return that.qqbot.sendGroupMessage([at_qq, Plain('进度：BOSS(' + current_boss.id + ') HP: ' + current_boss.hp + '/' + current_boss.max_hp)], group_id)
                    } else {
                        // 打屎了
                        that.log(`出刀 - ${user_name} - ${user_id} - BOSS:${current_boss.id} 已死`);
                        let next_id = current_boss.id + 1;//, round = parseInt(next_id / 5) + 1;
                        next_id >= 6 ? next_id = 1 : next_id;
                        let booking_list = that.getGuildSetting(guild_id, 'booking_list');
                        reply.push(Plain('当前BOSS已死，可下树玩家：\n'));
                        tree_list.map(t => {
                            that.log(`下树 - ${user_name} - ${user_id} - BOSS:${current_boss.id}`);
                            reply.push(t)
                        });
                        current_boss = that.setGuildCurrentBossById(guild_id, next_id);
                        reply.push(Plain('\nBOSS(' + current_boss.id + ') MaxHP: ' + current_boss.max_hp + ' 已开启，预订提醒：\n'));
                        for (let book of booking_list) {
                            if (book.boss_id === next_id) {
                                reply.push(book);
                                that.log(`预约 - ${user_name} - ${user_id} - BOSS:${current_boss.id} 提醒`);
                                let index = booking_list.indexOf(book);
                                delete booking_list[index];
                            }
                        }
                        that.setGuildSetting(guild_id, 'booking_list', booking_list.filter(b => !!b));
                        if (linked_id) {
                            let r = reply.map(r => r.text ||
                                (r.hasOwnProperty('is_tg') && (r.is_tg ? '<a href="tg://user?id=' + r.id + '">' + r.name + '</a> ' : r.name))
                            );
                            that.tgbot.sendMessage(linked_id, at_tg + ' ' + r.join(''), {parse_mode: 'HTML'}).catch(console.error)
                        }
                        reply = reply.map(r => r.hasOwnProperty('is_tg') ? (r.is_tg ? Plain(r.name) : At(r.id)) : r);
                        reply.splice(0, 0, at_qq);
                        return that.qqbot.sendGroupMessage(reply, group_id);
                    }
                }
            }
        }

        async function guild_boss_up_the_tree(msg, match) {
            debug(match);
            let is_tg = !!msg.from;
            let user_id = is_tg ? msg.from.id : msg.sender.id;
            let user_name = is_tg ? ((msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name) : msg.sender.memberName;
            let group_id = is_tg ? that.getGroupIDByLinkedID(msg.chat.id) : msg.sender.group.id;
            let linked_id = is_tg ? msg.chat.id : that.getLinkedIDByGroupID(group_id);
            let at_qq = '', at_tg = '';
            if (is_tg) {
                at_tg = '<a href="tg://user?id=' + user_id + '">' + user_name + '</a>';
                at_qq = Plain(user_name)
            } else {
                at_tg = user_name;
                at_qq = At(user_id)
            }
            let guild_id = that.getGroupSetting(group_id, 'guild_id');
            if (!guild_id) {
                if (is_tg) {
                    return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '请先创建或绑定一个公会', {parse_mode: 'HTML'}) : null;
                } else {
                    return that.qqbot.sendGroupMessage([at_qq, Plain('请先创建或绑定一个公会')], group_id)
                }
            }
            let current_boss = that.getGuildCurrentBoss(guild_id);
            if (current_boss) {
                let reply = [];
                let attacker_list = current_boss.attacker_list;
                let tree_list = current_boss.tree_list;
                let attacker = attacker_list.find(a => a.id === user_id);
                if (attacker) {
                    attacker_list = Utils.removeArrayItem(attacker_list, attacker)
                }
                let tree = tree_list.find(t => t.id === user_id);
                if (tree && !attacker) {
                    tree_list = Utils.removeArrayItem(tree_list, tree);
                    reply.push('已经在树上了')
                } else {
                    if (!attacker) {
                        if (is_tg) {
                            return linked_id ? that.tgbot.sendMessage(linked_id, at_tg + ' ' + '未申请出刀', {parse_mode: 'HTML'}) : null;
                        } else {
                            return that.qqbot.sendGroupMessage([at_qq, Plain('未申请出刀')], group_id)
                        }
                    }
                    that.log(`挂树 - ${user_name} - ${user_id} - BOSS:${current_boss.id} 挂树成功`);
                    tree_list.push({id: user_id, name: user_name, is_tg});
                    reply.push('申请挂树成功')
                }
                that.setGuildCurrentBoss(guild_id, current_boss);
                if (linked_id) {
                    that.tgbot.sendMessage(linked_id, at_tg + ' ' + reply.join('\n')).catch(console.error)
                }
                return that.qqbot.sendGroupMessage([at_qq, Plain(reply.join('\n'))], group_id)
            }
        }

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

    updateBookingList(guild_id, id, name, boss_id, is_tg = false) {
        let result;
        let booking_list = this.getGuildSetting(guild_id, 'booking_list') || [];
        let book = booking_list.find(b => !!b && b.id === id && b.boss_id === boss_id);
        if (!book) {
            booking_list.push({id, name, boss_id, is_tg});
            result = true
        } else {
            booking_list = Utils.removeArrayItem(booking_list, book);
            result = false
        }
        this.setGuildSetting(guild_id, 'booking_list', booking_list);
        return result
    }

    updateBossList(guild_id, boss) {
        let new_boss_list = [];
        let old_boss_list = this.getGuildSetting(guild_id, 'boss') || [];
        for (let i = 0; i < boss.length; i++) {
            let b = boss[i];
            if (b !== 'x') {
                if (b.includes('w')) {
                    b = parseInt(b);
                    b *= 10000;
                } else {
                    b = parseInt(b);
                }
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

    log(msg) {
        let now = new Date();
        let dateString = moment(now).format('YYYY-MM-DD');
        let timeString = moment(now).format('YYYY-MM-DD hh:mm:ss');
        fs.writeFileSync('./logs/pcr/' + dateString + '.txt', timeString + ' - ' + msg, 'w+')
    }
}

module.exports = PCRGuild;
