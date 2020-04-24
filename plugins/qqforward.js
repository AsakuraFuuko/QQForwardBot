const debug = require('debug')('plugin_qqforward');
const Plugin = require('./plugin');
const requestPromise = require('request-promise');
const fs = require('fs');
const DWebp = require('cwebp').DWebp;
const fileType = require('file-type');
const touch = require("touch");
const gifify = require('gifify');
const probe = require('node-ffprobe');

const configpath = './data/qqgroups.json';

class QQForward extends Plugin {
    constructor(params) {
        super(params);
        touch(configpath);
    }

    init() {
        this.qqbot.on('message', async (e, context, tags) => {
            debug(context);
            debug(tags);
            let title = '', msg = await this.parseMessage(context.message), msg_type = context.message_type;
            // message_type group
            //title += '<i>';
            title += `${context.sender.sex === 'male' ? '🚹' : '🚺'}` + (!!context.sender.card ? `${context.sender.card}` : `${context.sender.nickname}`);
            // title += `(${context.user_id})`;
            // title += `👥${context.group_id}`;
            //title += '</i>';
            let chat_id;

            if (msg_type === 'group') {
                let group_link_id = this.getGroupIDByLinkedID(context.group_id);
                if (group_link_id) {
                    chat_id = group_link_id
                } else {
                    chat_id = this.Config.tgbot.admin;
                    title += `👥${context.group_id}`;
                }
            } else {
                chat_id = this.Config.tgbot.admin;
                if (msg_type === 'private') {
                    title += `👤${context.user_id}`;
                }
            }

            this.tgbot.sendMessage(chat_id, title + ': ' + msg.msg, {
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
                                this.tgbot.sendAnimation(chat_id, data, {
                                    caption: title
                                }, {
                                    filename: 'a.gif',
                                    contentType: type.mime
                                })
                            } else {
                                this.tgbot.sendPhoto(chat_id, data, {
                                    caption: title
                                }, {
                                    filename: tag.attrs.file,
                                    contentType: type.mime
                                })
                            }
                        }).catch((e) => {
                            console.error(e);
                            this.tgbot.sendMessage(chat_id, '发送失败~')
                        })
                    }
                }
            })
        });

        this.qqbot.on('notice.group_upload', async (context) => {
            debug(context);
            return this.tgbot.sendMessage(this.Config.tgbot.admin, JSON.stringify(context, null, 2))
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
                let chat_id, group_link_id = this.getLinkedIDByGroupID(tg_chat_id),
                    is_private = false;
                if (!!group_link_id) {
                    chat_id = group_link_id
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
                    let msg_nick = [{
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
                    }];
                    let msg_no_nick = [{
                        type: 'text',
                        data: {text}
                    }];
                    if (is_private) {
                        this.qqbot('send_private_msg', {
                            user_id: chat_id,
                            message: msg_no_nick
                        })
                    } else {
                        this.qqbot('send_group_msg', {
                            group_id: chat_id,
                            message: this.getUserShowNickName(tg_chat_id, user_id) ? msg_no_nick : msg_nick
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
            this.setUserMute(chat_id, user_id, true);
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
            this.setUserMute(chat_id, user_id, false);
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
            this.setUserShowNickName(chat_id, user_id, true);
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
            this.setUserShowNickName(chat_id, user_id, false);
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
            this.setGroupLinkedID(chat_id, group_id);
            return this.tgbot.sendMessage(chat_id, 'linked ' + chat_id + ' <===> ' + group_id)
        });

        this.tgbot.onText(/\/unlink(@\w+)?/, (msg, match) => {
            let chat_id = msg.chat.id;
            let bot_name = match[1];
            if (bot_name && bot_name !== this.botname) {
                return;
            }
            console.log('unlink ', chat_id);
            this.setGroupLinkedID(chat_id, null);
            return this.tgbot.sendMessage(chat_id, chat_id + ' unlinked')
        })
    }

    stickerAndPhotoHandle(name, chat_id, text, image_file, is_sticker, is_private, is_giforvideo) {
        if (chat_id) {
            let file_id = image_file.file_id;
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
                if (is_giforvideo) {
                    // let file = fs.createReadStream(path);
                    let file1 = fs.createWriteStream(path + '.gif');
                    return probe(path).then((info) => {
                        let opt = {}, stream = info.streams[0];
                        if (stream) {
                            if (stream.width > 256) {
                                opt.resize = '256:-1'
                            } else if (256 * (stream.height / stream.width) > 256) {
                                opt.resize = '-1:256'
                            }
                            opt.fps = eval(stream.avg_frame_rate);
                            opt.colors = 256
                        }
                        let gif = gifify(path, opt).pipe(file1);
                        return new Promise((resolve) => {
                            gif.on('finish', () => {
                                resolve({path: '1.gif', image: fs.readFileSync(path + '.gif')})
                            })
                        })
                    })
                }
                return {path: '1.jpg', image: fs.readFileSync(path)}
            }).then((obj) => {
                if (obj.image.length === 0) return;
                let obj1 = {
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
                            text: text
                        }
                    }]
                };
                if (is_private) {
                    obj1.user_id = chat_id
                } else {
                    obj1.group_id = chat_id
                }
                return this.qqbot(is_private ? 'send_private_msg' : 'send_group_msg', obj1)
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
                // if (is_giforvideo) {
                //     fs.unlink(file_path + '.gif', (err) => {
                //         if (err) {
                //             console.error(err)
                //         }
                //     })
                // }
            })
        }
    }

    getLinkedIDByGroupID(group_id) {
        return this.getGroupSetting(group_id, 'linked_id')
    }

    getGroupIDByLinkedID(linked_id) {
        let json = fs.readFileSync(configpath, 'utf8');
        let groups = !!json ? JSON.parse(json) : [];
        let group = groups.find(a => a.linked_id === linked_id.toString());
        if (!!group) {
            return group.group_id
        } else {
            return null
        }
    }

    setGroupLinkedID(group_id, linked_id) {
        this.setGroupSetting(group_id, 'linked_id', linked_id)
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
            let user = users.find(a => a.user_id === user_id);
            return user ? user[key] : null;
        }
        return null;
    }

    setUserSettingByGroup(group_id, user_id, key, value) {
        let users = this.getGroupSetting(group_id, 'users') || [];
        let user = users.find(a => a.group_id === group_id && a.user_id === user_id);
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

    getGroupSetting(group_id, key) {
        let json = fs.readFileSync(configpath, 'utf8');
        let groups = !!json ? JSON.parse(json) : [];
        let group = groups.find(a => a.group_id === group_id);
        if (!!group) {
            return group[key];
        } else {
            return null;
        }
    }

    setGroupSetting(group_id, key, value) {
        let json = fs.readFileSync(configpath, 'utf8');
        let groups = !!json ? JSON.parse(json) : [];
        let group = groups.find(a => a.group_id === group_id);
        if (!!group) {
            debug('已存在，替换');
            let index = groups.indexOf(group);
            groups[index][key] = value;
        } else {
            let obj = {group_id};
            obj[key] = value;
            groups.push(obj)
        }
        fs.writeFileSync(configpath, JSON.stringify(groups))
    }
}

module.exports = QQForward;
