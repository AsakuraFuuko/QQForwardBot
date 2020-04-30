const debug = require('debug')('plugin_pcr_gacha');
const fs = require('fs');
const Path = require('path');
const Images = require("images");
const Mirai = require('node-mirai-sdk');
const {Image} = Mirai.MessageComponent;
const Plugin = require('../plugin');
const Utils = require('../../lib/utils');

class PCRGacha extends Plugin {
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

            Plugin.onText(/boomcr(:?10|十)[连|連]/, message.messageChain, async (msg, match) => {
                debug(match);
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

        this.tgbot.onText(/\/gacha(@\w+)?/, async (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            let result = this.getGacha();
            let path = './download/pcr/' + Utils.getRandomString() + '.png';
            await this.makePhoto(result, path).return;
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
        let prop = 0, results = [];
        for (let p of Object.values(this.pool)) {
            prop += p.prop;
        }
        for (let i = 0; i < combo - 1; i++) {
            let resu = Utils.random() * prop;
            for (let p of Object.values(this.pool)) {
                resu -= p.prop;
                if (resu < 0) {
                    let chapters = p.pool.filter(c => !c.not_in_pool);
                    // chapters = chapters.filter(c => !this.includes(c, results));
                    results.push({
                        prefix: p.prefix,
                        star: p.star,
                        chapter: Utils.randomChoice(chapters)
                    });
                    break;
                }
            }
        }
        prop = 0;
        for (let p of Object.values(this.pool)) {
            prop += p.prop_last;
        }
        let resu = Utils.random() * prop;
        for (let p of Object.values(this.pool)) {
            resu -= p.prop_last;
            if (resu < 0) {
                let chapters = p.pool.filter(c => !c.not_in_pool);
                // chapters = chapters.filter(c => !this.includes(c, results));
                results.push({
                    prefix: p.prefix,
                    star: p.star,
                    chapter: Utils.randomChoice(chapters)
                });
                break;
            }
        }
        return results;
    }

    makePhoto(result, filepath) {
        let photo = Images((128 + 10) * 5, (128 + 10) * 2).fill(255, 255, 255, 1);
        let boarders = [
            Images('./plugins/pcr/img/boarder/boarder_star1.png'),
            Images('./plugins/pcr/img/boarder/boarder_star2.png'),
            Images('./plugins/pcr/img/boarder/boarder_star3.png')
        ];
        for (let i = 0; i < result.length; i++) {
            let star = result[i].star;
            let id = result[i].chapter.id;
            let img = Images('./plugins/pcr/img/' + (star < 3 ? 1 : 3) + '/' + id + (star < 3 ? 1 : 3) + '1.png');
            let x = 5 + (10 + 128) * (i % parseInt(result.length / 2)),
                y = 5 + (10 + 128) * parseInt(i / parseInt(result.length / 2));
            // console.log(i, x, y);
            photo.draw(img, x, y);
            photo.draw(boarders[star - 1], x, y)
        }
        return photo.save(filepath, 'png')
    }

    includes(object, array) {
        let result = false;
        for (let a of array) {
            if (a.chapter.id === object.id) {
                result = true;
                break;
            }
        }
        return result;
    }
}

module.exports = PCRGacha;
