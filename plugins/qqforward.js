const debug = require('debug')('plugin_qqforward');
const Plugin = require('./plugin');
const requestPromise = require('request-promise');
const fs = require('fs');
const DWebp = require('cwebp').DWebp;
const fileType = require('file-type');

class QQForward extends Plugin {
    constructor(params) {
        super(params);
        this.mutes = [];
    }

    init() {
        this.qqbot.on('message.group', async (e, context, tags) => {
            debug(context);
            debug(tags);
            let title = '', msg = context.message;

            //title += '<i>';
            title += /*`${context.sender.sex === 'male' ? '🚹' : '🚺'}` + */(!!context.sender.card ? `${context.sender.card}` : `${context.sender.nickname}`);
            // title += `(${context.user_id})`;
            // title += `👥${context.group_id}`;
            //title += '</i>';

            msg = await this.parseMessage(context.message);

            this.tgbot.sendMessage(this.Config.tgbot.user_id, title + ': ' + msg.msg, {
                disable_web_page_preview: true,
                parse_mode: 'HTML',
            }).then(() => {
                for (let tag of msg.tags) {
                    if (tag.type === 'image' && tag.attrs.url != null) {
                        let options = {
                            url: tag.attrs.url.replace('https://', 'http://'),
                            encoding: null
                        };
                        requestPromise.get(options).then((data) => {
                            let type = fileType(data);
                            if (type.ext === 'gif') {
                                this.tgbot.sendAnimation(this.Config.tgbot.user_id, data, {
                                    caption: title
                                }, {
                                    filename: 'a.gif',
                                    contentType: type.mime
                                })
                            } else {
                                this.tgbot.sendPhoto(this.Config.tgbot.user_id, data, {
                                    caption: title
                                }, {
                                    filename: tag.attrs.file,
                                    contentType: type.mime
                                })
                            }
                        }).catch((e) => {
                            console.error(e);
                            this.tgbot.sendMessage(this.Config.tgbot.user_id, '发送失败~')
                        })
                    }
                }
            })
        });

        this.tgbot.on('message', (msg) => {
            debug(msg);
            let user_id = msg.from.id;
            let is_command = msg.entities && msg.entities.filter((entry) => entry.offset === 0 && entry.type === 'bot_command').length > 0;
            if (!is_command && (msg.reply_to_message || !this.mutes.includes(user_id))) {
                if (msg.sticker || msg.photo) {
                    this.stickerAndPhotoHandle(msg);
                } else {
                    let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
                    let text = msg.text;
                    let tmp = (msg.reply_to_message && (msg.reply_to_message.text || msg.reply_to_message.caption)) || '';
                    let match = tmp.match(/👥(\d+)/);
                    if (!text) return;
                    let group_id = this.Config.qqbot.group;
                    if (match) {
                        group_id = match[1];
                    }
                    if (text !== '' && group_id) {
                        this.qqbot('send_group_msg', {
                            group_id,
                            message: [{
                                type: 'text',
                                data: {
                                    text: /*'😶' +*/ name
                                }
                            }, {
                                type: 'text',
                                data: {
                                    text: ': '
                                }
                            }, {
                                type: 'text',
                                data: {text}
                            }]
                        })
                    }
                }
            }
        });

        this.tgbot.onText(/\/mute(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('mute', msg.from);
            if (!this.mutes.includes(user_id)) {
                this.mutes.push(user_id)
            }
            return this.tgbot.sendMessage(chat_id, '已设置不转发消息到QQ~')
        });

        this.tgbot.onText(/\/unmute(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            if (this.mutes.includes(user_id)) {
                this.mutes = this.mutes.filter((mute) => mute !== user_id);
            }
            console.log('unmute', msg.from);
            return this.tgbot.sendMessage(chat_id, '已设置转发消息到QQ~')
        })
    }

    stickerAndPhotoHandle(msg) {
        let chat_id = msg.chat.id;
        let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
        let tmp = (msg.reply_to_message && (msg.reply_to_message.text || msg.reply_to_message.caption)) || '';
        let group_id = (tmp.match(/👥(\d+)/) && tmp.match(/👥(\d+)/)[1]) || this.Config.qqbot.group;
        let caption = msg.caption || (msg.reply_to_message && msg.reply_to_message.caption) || '';
        if (group_id) {
            let is_sticker = msg.sticker;
            let file = is_sticker ? msg.sticker : msg.photo.pop();
            let file_id = file.file_id;
            let file_path = '';
            return this.tgbot.downloadFile(file_id, `./download/images`).then((path) => {
                debug(path);
                file_path = path;
                if (is_sticker) {
                    let file = fs.createReadStream(path);
                    let decoder = new DWebp(file);
                    return decoder.toBuffer().then((body) => {
                        return {path: 'i.png', image: body}
                    })
                }
                return {path: '1.jpg', image: fs.readFileSync(path)}
            }).then((obj) => {
                return this.qqbot('send_group_msg', {
                    group_id,
                    message: [{
                        type: 'text',
                        data: {
                            text: /*'😶' +*/ name
                        }
                    }, {
                        type: 'text',
                        data: {
                            text: ': '
                        }
                    }, {
                        type: 'image',
                        data: {
                            file: 'base64://' + obj.image.toString('base64')
                        }
                    }, {
                        type: 'text',
                        data: {
                            text: caption
                        }
                    }]
                })
            }).catch((err) => {
                console.error(err);
                return this.tgbot.sendMessage(chat_id, '发送失败~')
            }).finally(() => {
                if (!!file_path) {
                    fs.unlink(file_path, (err) => {
                        if (err) {
                            console.error(err)
                        }
                    })
                }
            })
        }
    }
}

module.exports = QQForward;
