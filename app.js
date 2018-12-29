'use strict';
const debug = require('debug')('chinonyanbot');
const TelegramBot = require('node-telegram-bot-api');
const requestPromise = require('request-promise');
const request = require('request');
const fs = require('fs');
const DWebp = require('cwebp').DWebp;

const QQBot = require('./lib/qqbot');
const Music = require('./lib/music');
const Config = require('./lib/config');

const regex = /\[CQ:image,file=(.+?),url=(.+?)]/ig;

const tgbot = new TelegramBot(Config.tgbot.token, {polling: true});

let botname = '@' + Config.tgbot.username;

tgbot.getMe().then((msg) => {
    botname = '@' + msg.username;
});

// other start
tgbot.onText(/\/start(@\w+)?/, (msg, match) => {
    let chat_id = msg.chat.id;
    let bot_name = match[1];
    if (bot_name && bot_name !== botname) {
        return;
    }
    console.log('start', msg.from);
    return tgbot.sendMessage(chat_id, '喵~')
});

tgbot.onText(/\/debug(@\w+)?/, (msg, match) => {
    let chat_id = msg.chat.id;
    let bot_name = match[1];
    if (bot_name && bot_name !== botname) {
        return;
    }
    return tgbot.sendMessage(chat_id, JSON.stringify(msg, null, 2))
});
// other end

// qqbot start
const qqbot = new QQBot(Config.qqbot.webhook_host, Config.qqbot.webhook_port, Config.qqbot.api_url, Config.qqbot.token);

qqbot.onMessage((msg) => {
    debug(msg);
    onText(/.*/, msg, (msg, match) => {
        if (msg.post_type === 'message' && msg.message_type === 'group' && msg.message.trim() !== '') {
            tgbot.sendMessage(Config.tgbot.user_id, '<i>[' + msg.sender.nickname + '][' + msg.sender.card + '][' + msg.user_id + '](' + msg.group_id + ')</i>\n\n' + msg.message.replace(regex, '[图片]'), {
                disable_web_page_preview: true,
                parse_mode: 'HTML',
            }).then(() => {
                if (msg.message.includes('CQ:image,file=')) {
                    let m;
                    while ((m = regex.exec(msg.message)) !== null) {
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        let url = m[2];
                        let options = {
                            url: url.replace('https://', 'http://'),
                            encoding: null
                        };
                        requestPromise.get(options).then((data) => {
                            tgbot.sendPhoto(Config.tgbot.user_id, data, {
                                caption: `[${msg.sender.nickname}][${msg.sender.card}]`
                            })
                        })
                    }
                }
            })
        }
    });
    onText(/(我要听)(?! )?(.*)/, msg, (msg, match) => {
        if (!match[2]) {
            qqbot.sendGroupMessage(msg.group_id, '你要听什么~');
            return false
        }
        let keywords = match[2].trim();
        Music.search(keywords).then((id) => {
            if (id !== -1) {
                qqbot.sendGroupMessage(msg.group_id, `[CQ:music,id=${id},type=qq]`)
            } else {
                qqbot.sendGroupMessage(msg.group_id, '没找到~');
            }
        })
    })
});

tgbot.on('callback_query', async (callbackQuery) => {
    let action = callbackQuery.data;
    let msg = callbackQuery.message;
    let chat_type = msg.chat.type;
    let title = chat_type.includes('group') ? msg.chat.title : null;
    let opts = {
        user_id: callbackQuery.from.id,
        chat_id: msg.chat.id,
        msg_id: msg.message_id,
        callback_id: callbackQuery.id,
        chat_type: chat_type,
        title
    };
    if (msg.reply_to_message) {
        opts.org_msg_id = msg.reply_to_message.message_id
    }

});

function stickerAndPhotoHandle(msg) {
    let chat_id = msg.chat.id;
    let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
    let tmp = msg.reply_to_message.text;
    let group_id = tmp.match(/\((.+?)\)/)[1];
    if (group_id) {
        let is_sticker = msg.sticker;
        let file = is_sticker ? msg.sticker : msg.photo.pop();
        let file_id = file.file_id;
        return tgbot.downloadFile(file_id, `./download/images`).then((path) => {
            debug(path);
            let file = fs.createReadStream(path);
            if (is_sticker) {
                let decoder = new DWebp(file);
                return decoder.toBuffer().then((body) => {
                    return {path: 'i.png', image: body}
                })
            }
            return {path: '1.jpg', image: file}
        }).then((obj) => {
            return {
                method: 'POST',
                url: 'https://sm.ms/api/upload',
                formData: {
                    'smfile': {
                        value: obj.image,
                        options: {
                            filename: obj.path
                        }
                    }
                },
                headers: {
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36'
                }
            }
        }).then((options) => {
            return requestPromise(options)
        }).then((body) => {
            let obj = JSON.parse(body);
            debug(obj);
            if (obj.code === 'success') {
                return qqbot.sendGroupMessage(group_id, obj.data.url)
            }
        }).catch((err) => {
            console.error(err);
            return tgbot.sendMessage(chat_id, '发送失败~')
        })
    }
}

function onText(regex, message, callback) {
    debug('Matching %s with %s', message.message, regex);
    const result = regex.exec(message.message);
    if (!result) {
        return false;
    }
    regex.lastIndex = 0;
    debug('Matches %s', regex);
    callback(message, result);
}

tgbot.on('message', (msg) => {
    debug(msg);
    if (msg.reply_to_message) {
        if (msg.sticker || msg.photo) {
            stickerAndPhotoHandle(msg);
        } else {
            let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
            let text = msg.text;
            let tmp = msg.reply_to_message.text;
            let match = tmp.match(/\((.+?)\)/);
            if (match) {
                let group_id = match[1];
                if (text !== '' && group_id) {
                    qqbot.sendGroupMessage(group_id, text)
                }
            }
        }
    }
});
// qqbot end

process.on('unhandledRejection', (reason) => {
    console.error(reason);
    //   process.exit(1);
});

qqbot.startListen();
