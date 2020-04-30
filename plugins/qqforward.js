const debug = require('debug')('plugin_qqforward');
const Plugin = require('./plugin');
const Utils = require('../lib/utils');
const requestPromise = require('request-promise');
const fs = require('fs');
const DWebp = require('cwebp').DWebp;
const fileType = require('file-type');
const gifify = require('gifify');
const probe = require('node-ffprobe');
const Mirai = require('node-mirai-sdk');
const {Plain, Image, Json, Xml, App} = Mirai.MessageComponent;

class QQForward extends Plugin {
    constructor(params) {
        super(params);
    }

    init() {
        this.qqbot.onMessage(async (message) => {
            debug(message);
            let that = this;
            let title = '', msg = await this.parseMessage(message.messageChain), msg_type = message.type;
            title += message.sender.memberName || message.sender.remark || message.sender.nickname;
            let chat_id, retry = 0;

            if (!msg.text) return;

            if (msg_type === 'GroupMessage') {
                let group_link_id = this.getLinkedIDByGroupID(message.sender.group.id);
                if (group_link_id) {
                    chat_id = group_link_id
                } else {
                    chat_id = this.Config.tgbot.admin;
                    title += `👥${message.sender.group.id}`;
                }
            } else {
                chat_id = this.Config.tgbot.admin;
                if (msg_type === 'FriendMessage') {
                    title += `👤${message.sender.id}`;
                }
            }

            this.tgbot.sendMessage(chat_id, title + ': ' + msg.text, {
                disable_web_page_preview: true,
                parse_mode: 'HTML',
            }).then(async (msg1) => {
                let photoss = [], photos = [], length = 0, gifs = [];
                for (let tag of msg.tags) {
                    if (tag.type === 'Image' && tag.url != null) {
                        let options = {
                            url: tag.url.replace('https://', 'http://'),
                            encoding: null
                        };
                        let img = await sendPhoto(options);
                        if (length > 10) {
                            photoss.push(photos);
                            photos = [];
                            length = 0;
                        } else {
                            if (img.type === 'gif') {
                                photoss.push([img]);
                                photos = [];
                                length = 0;
                            } else {
                                photos.push(img);
                                length += 1;
                            }
                        }
                    }
                }
                if (photos.length > 0) {
                    photoss.push(photos);
                }
                for (let photos of photoss) {
                    if (photos.length > 1) {
                        //sendMediaGroup
                        let imgs = photos.map((img => {
                            return {
                                type: 'photo',
                                caption: title,
                                media: img.data
                            }
                        }));
                        await this.tgbot.sendMediaGroup(chat_id, imgs, {
                            reply_to_message_id: msg1.message_id
                        })
                    } else {
                        let photo = photos[0];
                        await this.tgbot[photo.type === 'gif' ? 'sendAnimation' : 'sendPhoto'](chat_id, photo.data, {
                            caption: title,
                            reply_to_message_id: msg1.message_id
                        }, {
                            filename: photo.filename,
                            contentType: photo.mime
                        })
                    }
                }
            });

            async function sendPhoto(options) {
                return requestPromise.get(options).then((data) => {
                    let type = fileType(data);
                    return {data, type: type.ext, filename: Utils.getRandomString() + '.' + type.ext, mime: type.mime}
                }).catch((e) => {
                    if (retry > 5) {
                        console.error(e);
                        return that.tgbot.sendMessage(chat_id, '发送失败~')
                    } else {
                        retry += 1;
                        return sendPhoto(options)
                    }
                })
            }
        });

        this.tgbot.on('message', (msg) => {
            debug(msg);
            let user_id = msg.from.id;
            let tg_chat_id = msg.chat.id;
            let msg_type = msg.chat.type;
            if (msg_type !== 'private' && this.getUserMute(tg_chat_id, user_id)) return; //Mute
            let is_command = msg.entities && msg.entities.filter((entry) => entry.offset === 0 && entry.type === 'bot_command').length > 0;
            if (!is_command) {
                let name = (msg.from.last_name ? msg.from.last_name : '') + msg.from.first_name;
                let text = msg.text;
                let tmp = (msg.reply_to_message && (msg.reply_to_message.text || msg.reply_to_message.caption)) || '';
                let chat_id, group_id = this.getGroupIDByLinkedID(tg_chat_id),
                    is_private = false;
                if (!!group_id) {
                    chat_id = group_id
                } else { //private chat
                    let match = tmp.match(/👥(\d+)/);
                    let match2 = tmp.match(/👤(\d+)/);
                    if (match) {
                        chat_id = match[1];
                    }
                    if (match2) {
                        chat_id = match2[1];
                        is_private = true;
                    }
                }

                if (msg.sticker || msg.photo || msg.document) {
                    let caption = msg.caption || '';//(msg.reply_to_message && msg.reply_to_message.caption) || '';
                    let is_sticker = !!msg.sticker, is_giforvideo = false;
                    let file;
                    if (msg.document) {
                        if (msg.document.mime_type.startsWith('image')) {
                            file = msg.document
                        } else if (msg.document.mime_type.startsWith('video') && msg.document.file_size <= (10 * 1024 * 1024)) {
                            file = msg.document;
                            is_giforvideo = true
                        }
                    } else {
                        file = is_sticker ? msg.sticker : msg.photo.pop();
                    }
                    return this.stickerAndPhotoHandle(name, chat_id, caption, file, is_sticker, is_private, is_giforvideo)
                }

                if (text !== '' && chat_id) {
                    let msg_nick = [Plain(name), Plain(': '), Plain(text)];
                    let msg_no_nick = [Plain(text)];
                    if (text.startsWith('!json!')) {
                        msg_nick = msg_no_nick = [Json(text.replace('!json!', ''))]
                    }
                    if (text.startsWith('!xml!')) {
                        msg_nick = msg_no_nick = [Xml(text.replace('!xml!', ''))]
                    }
                    if (text.startsWith('!app!')) {
                        msg_nick = msg_no_nick = [App(text.replace('!app!', ''))]
                    }
                    if (is_private) {
                        this.qqbot.sendFriendMessage(msg_no_nick, chat_id)
                    } else {
                        this.qqbot.sendGroupMessage(this.getUserShowNickName(tg_chat_id, user_id) ? msg_no_nick : msg_nick, chat_id)
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
            let group_id = this.getGroupIDByLinkedID(chat_id);
            if (!group_id) {
                return this.tgbot.sendMessage(chat_id, '请先绑定一个QQ群')
            }
            this.setUserMute(group_id, user_id, true);
            return this.tgbot.sendMessage(chat_id, '已设置不转发消息到QQ~')
        });

        this.tgbot.onText(/\/unmute(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('unmute', msg.from);
            let group_id = this.getGroupIDByLinkedID(chat_id);
            if (!group_id) {
                return this.tgbot.sendMessage(chat_id, '请先绑定一个QQ群')
            }
            this.setUserMute(group_id, user_id, false);
            return this.tgbot.sendMessage(chat_id, '已设置转发消息到QQ~')
        });

        this.tgbot.onText(/\/nickname_on(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('nickname on', msg.from);
            let group_id = this.getGroupIDByLinkedID(chat_id);
            if (!group_id) {
                return this.tgbot.sendMessage(chat_id, '请先绑定一个QQ群')
            }
            this.setUserShowNickName(group_id, user_id, true);
            return this.tgbot.sendMessage(chat_id, '已打开QQ昵称显示~')
        });

        this.tgbot.onText(/\/nickname_off(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let user_id = msg.from.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('nickname off', msg.from);
            let group_id = this.getGroupIDByLinkedID(chat_id);
            if (!group_id) {
                return this.tgbot.sendMessage(chat_id, '请先绑定一个QQ群')
            }
            this.setUserShowNickName(group_id, user_id, false);
            return this.tgbot.sendMessage(chat_id, '已关闭QQ昵称显示~')
        });

        this.tgbot.onText(/\/link(@\w+)?(?: )?(\d+)/, (msg, match) => {
            let chat_id = msg.chat.id;
            let group_id = match[2];
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('linking ', chat_id, ' <===> ', group_id);
            this.setGroupLinkedID(group_id, chat_id);
            return this.tgbot.sendMessage(chat_id, 'linked ' + chat_id + ' <===> ' + group_id)
        });

        this.tgbot.onText(/\/unlink(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('unlink ', chat_id);
            let group_id = this.getGroupIDByLinkedID(chat_id);
            if (!group_id) {
                return this.tgbot.sendMessage(chat_id, '请先绑定一个QQ群')
            }
            this.setGroupLinkedID(group_id, null);
            return this.tgbot.sendMessage(chat_id, chat_id + ' unlinked')
        })
    }

    stickerAndPhotoHandle(name, chat_id, text, image_file, is_sticker, is_private, is_giforvideo) {
        if (chat_id && image_file) {
            let file_id = image_file.file_id;
            let file_path = '';
            return this.tgbot.downloadFile(file_id, `./download/images`).then((path) => {
                debug(path);
                file_path = path;
                if (is_sticker) {
                    let file = fs.createReadStream(path);
                    let decoder = new DWebp(file);
                    return decoder.write(path + '.png').then(() => path + '.png')
                }
                if (is_giforvideo) {
                    // let file = fs.createReadStream(path);
                    let file1 = fs.createWriteStream(path + '.gif');
                    return probe(path).then((info) => {
                        let opt = {}, stream = info.streams[0];
                        if (stream) {
                            if (stream.width > 400) {
                                opt.resize = '400:-1'
                            } else if (400 * (stream.height / stream.width) > 400) {
                                opt.resize = '-1:400'
                            }
                            opt.fps = eval(stream.avg_frame_rate);
                            opt.colors = 256
                        }
                        let gif = gifify(path, opt).pipe(file1);
                        return new Promise((resolve) => {
                            gif.on('finish', () => {
                                resolve(path + '.gif')
                            })
                        })
                    })
                }
                return path
            }).then((path) => {
                if (!path) throw new Error('no image');
                return this.qqbot.uploadImage(path, {type: is_private ? 'FriendMessage' : 'GroupMessage'});
            }).then((obj) => {
                debug(obj);
                // obj.imageId = obj.imageId.replace('.mirai', is_giforvideo ? '.gif' : '.png');
                let obj1 = [Image(obj), Plain('\n'), Plain(name), Plain('\n'), Plain(text)];
                if (is_private) {
                    return this.qqbot.sendFriendMessage(obj1, chat_id)
                } else {
                    return this.qqbot.sendGroupMessage(obj1, chat_id)
                }
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
                if (is_sticker) {
                    fs.unlink(file_path + '.png', (err) => {
                        if (err) {
                            console.error(err)
                        }
                    })
                }
                if (is_giforvideo) {
                    fs.unlink(file_path + '.gif', (err) => {
                        if (err) {
                            console.error(err)
                        }
                    })
                }
            })
        }
    }

    getUserShowNickName(group_id, user_id) {
        return this.getUserSettingByGroup(group_id, user_id, 'show_nickname')
    }

    setUserShowNickName(group_id, user_id, show_nickname) {
        this.setUserSettingByGroup(group_id, user_id, 'show_nickname', show_nickname)
    }

    getUserMute(group_id, user_id) {
        return this.getUserSettingByGroup(group_id, user_id, 'is_mute')
    }

    setUserMute(group_id, user_id, is_mute) {
        this.setUserSettingByGroup(group_id, user_id, 'is_mute', is_mute)
    }

    getUserSettingByGroup(group_id, user_id, key) {
        let users = this.getGroupSetting(group_id, 'users');
        if (!!users) {
            let user = users.find(a => a.user_id.toString() === user_id.toString());
            return user ? user[key] : null;
        }
        return null;
    }

    setUserSettingByGroup(group_id, user_id, key, value) {
        let users = this.getGroupSetting(group_id, 'users') || [];
        let user = users.find(a => a.group_id.toString() === group_id.toString() && a.user_id.toString() === user_id.toString());
        if (!!user) {
            debug('已存在，替换');
            let index = users.indexOf(user);
            users[index][key] = value;
        } else {
            let obj = {user_id};
            obj[key] = value;
            users.push(obj)
        }
        this.setGroupSetting(group_id, 'users', users)
    }

}

module.exports = QQForward;
