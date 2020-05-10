const debug = require('debug')('plugin_pcr_gacha');
const fs = require('fs');
const Path = require('path');
const gm = require('gm');
const Mirai = require('node-mirai-sdk');
const {Image} = Mirai.MessageComponent;
const Plugin = require('../plugin');
const Utils = require('../../lib/utils');

class PCRGacha extends Plugin {
    constructor(params) {
        super(params);
        this.site = 'cn';
        this.chapters = require('./chapters');
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

            Plugin.onText(/(?<site>[cjt])cr(:?10|十)[连|連]/, message, async (msg, match) => {
                debug(match);
                let site = match.groups.site;
                if (!site) site = 'cn';
                this.site = site === 'j' ? 'jp' : site === 't' ? 'tw' : 'cn';
                let result = this.getGacha();
                let path = './download/pcr/' + Utils.getRandomString() + '.png';
                await this.makePhoto(result, path);
                this.qqbot.uploadImage(path, {type: msg_type}).then((img) => {
                    return this.qqbot[msg_type === 'GroupMessage' ? 'sendGroupMessage' : 'sendFriendMessage']([Image(img)], chat_id)
                }).finally(() => {
                    fs.unlink(path, (err) => {
                        if (err) {
                            console.error(err)
                        }
                    })
                })
            });
        });

        this.tgbot.onText(/\/gacha[_]?(?<site>cn|tw|jp)?(?<bot_name>@\w+)?/, async (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match.groups.bot_name;
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            let site = match.groups.site;
            if (!site) site = 'cn';
            this.site = site;
            let result = this.getGacha();
            let path = './download/pcr/' + Utils.getRandomString() + '.png';
            await this.makePhoto(result, path);
            return this.tgbot.sendPhoto(chat_id, path).finally(() => {
                fs.unlink(path, (err) => {
                    if (err) {
                        console.error(err)
                    }
                })
            })
        });
    }

    getGacha(combo = 10) {
        let pools = require('./pool_template_' + this.site).pool;
        let prop = 0, results = [];
        for (let p of Object.values(pools)) {
            prop += p.prop;
        }
        for (let i = 0; i < combo - 1; i++) {
            let resu = Math.floor(Utils.random() * prop);
            for (let p of Object.values(pools)) {
                resu -= p.prop;
                if (resu < 0) {
                    let chapters = p.pool;//.filter(c => !c.not_in_pool);
                    // chapters = chapters.filter(c => !this.includes(c, results));
                    results.push({
                        prefix: p.prefix,
                        star: p.star,
                        chapter: this.getChapterByName(Utils.randomChoice(chapters))
                    });
                    break;
                }
            }
        }
        results = Utils.shuffledArrayItem(results);
        prop = 0;
        for (let p of Object.values(pools)) {
            prop += p.prop_last;
        }
        let resu = Math.floor(Utils.random() * prop);
        for (let p of Object.values(pools)) {
            resu -= p.prop_last;
            if (resu < 0) {
                let chapters = p.pool;//.filter(c => !c.not_in_pool);
                // chapters = chapters.filter(c => !this.includes(c, results));
                results.push({
                    prefix: p.prefix,
                    star: p.star,
                    chapter: this.getChapterByName(Utils.randomChoice(chapters))
                });
                break;
            }
        }
        return results;
    }

    getChapterByName(name) {
        let result = Object.values(this.chapters).flat(Infinity).find(c => c[this.site + '_name'] === name);
        return !!result ? result : name;
    }

    makePhoto(result, filepath) {
        let photo = gm((128 + 10) * Math.min(5, result.length), (128 + 10) * Math.floor(result.length / 5), '#ffffff');
        let boarders = [
            './plugins/pcr/img/boarder/boarder_star1.png',
            './plugins/pcr/img/boarder/boarder_star2.png',
            './plugins/pcr/img/boarder/boarder_star3.png'
        ];
        for (let i = 0; i < result.length; i++) {
            let star = result[i].star;
            let id = result[i].chapter.id;
            let name = result[i].chapter[this.site + '_name'];
            let img = './plugins/pcr/img/' + (star < 3 ? 1 : 3) + '/' + (id + (star < 3 ? 10 : 30)) + '.png';
            let x = 5 + (10 + 128) * ((i % 5) || 0),
                y = 5 + (10 + 128) * (parseInt(i / 5) || 0);
            // console.log(i, x, y);
            photo = photo.in('-page', `+${x}+${y}`).in(img);
            photo = photo.in('-page', `+${x}+${y}`).in(boarders[star - 1]);
        }
        return new Promise(((resolve, reject) => photo.mosaic().write(filepath, function (err) {
            if (err) reject(err);
            else resolve()
        })))
    }

    includes(object, array) {
        let result = false;
        for (let a of array) {
            if (a.chapter[this.site + '_name'] === object) {
                result = true;
                break;
            }
        }
        return result;
    }
}

module.exports = PCRGacha;
