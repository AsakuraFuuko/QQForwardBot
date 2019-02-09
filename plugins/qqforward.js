const debug = require('debug')('plugin_qqforward');
const Plugin = require('./plugin');
const requestPromise = require('request-promise');
const fs = require('fs');
const DWebp = require('cwebp').DWebp;
const fileType = require('file-type');

class QQForward extends Plugin {
    constructor(params) {
        super(params);
    }

    init() {
        this.qqbot.on('message.group', async (e, context, tags) => {
            debug(context);
            debug(tags);
            let title = '', msg = context.message;

            //title += '<i>';
            title += `${context.sender.sex === 'male' ? '🚹' : '🚺'}` + (!!context.sender.card ? `${context.sender.card}` : `${context.sender.nickname}`);
            title += `(${context.user_id})`;
            title += `👥${context.group_id}`;
            //title += '</i>';

            msg = await this.parseMessage(context.message);

            this.tgbot.sendMessage(this.Config.tgbot.user_id, title + '\n\n' + msg.msg, {
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
                            debug(e);
                            this.tgbot.sendMessage(this.Config.tgbot.user_id, '发送失败~')
                        })
                    }
                }
            })
        });

        this.tgbot.on('message', (msg) => {
            debug(msg);
            if (msg.reply_to_message) {
                if (msg.sticker || msg.photo) {
                    this.stickerAndPhotoHandle(msg);
                } else {
                    let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
                    let text = msg.text;
                    let tmp = msg.reply_to_message.text || msg.reply_to_message.caption;
                    let match = tmp.match(/👥(\d+)/);
                    if (match) {
                        let group_id = parseInt(match[1]);
                        if (text !== '' && group_id) {
                            this.qqbot('send_group_msg', {
                                group_id,
                                message: text
                            })
                        }
                    }
                }
            }
        });
    }

    stickerAndPhotoHandle(msg) {
        let chat_id = msg.chat.id;
        let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
        let tmp = msg.reply_to_message.text || msg.reply_to_message.caption;
        let group_id = tmp.match(/👥(\d+)/)[1];
        if (group_id) {
            let is_sticker = msg.sticker;
            let file = is_sticker ? msg.sticker : msg.photo.pop();
            let file_id = file.file_id;
            return this.tgbot.downloadFile(file_id, `./download/images`).then((path) => {
                debug(path);
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
                    message: {
                        "type": "image",
                        "data": {
                            "file": 'base64://' + obj.image.toString('base64')
                        }
                    }
                })
            }).catch((err) => {
                console.error(err);
                return this.tgbot.sendMessage(chat_id, '发送失败~')
            })
        }
    }
}

module.exports = QQForward;
