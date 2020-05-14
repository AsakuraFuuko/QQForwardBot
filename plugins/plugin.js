const debug = require('debug')('plugin');
const CQTAGS_EXTRACTOR = /\[CQ[^\]]*]/g;
const CQTAG_ANALYSOR = /\[CQ:(.*)*]/;
const touch = require("touch");
const fs = require('fs');

const configpath = './data/qqgroups.json';

class Plugin {
    constructor(params) {
        touch(configpath);
        this.tgbot = params.tgbot;
        this.Config = params.Config;
        this.qqbot = params.qqbot;
        this.botname = params.botname;
        this.init();
    }

    static onText(regex, msg, callback) {
        let message_string = '';
        for (let message of msg.messageChain) {
            if (message.type === 'Plain') {
                message_string += message.text
            }
        }
        debug('Matching %s with %s', message_string, regex);
        const result = regex.exec(message_string);
        if (!result) {
            return false;
        }
        regex.lastIndex = 0;
        debug('Matches %s', regex);
        callback(msg, result);
    }

    static parseTag(tag) {
        tag = tag.replace(/[\r\n]/g, '');
        let groups = tag.match(CQTAG_ANALYSOR);
        let type = '', attrs = {};
        for (let match of groups[1].split(',')) {
            if (!match.includes('=')) {
                type = match
            } else {
                let key = match.split('=')[0];
                attrs[key] = match.split('=').splice(1).join('')
            }
        }
        return {type, attrs}
    }

    init() {

    }

    async parseMessage(tags) {
        let msg = '';
        if (tags && tags.length > 0) {
            for (let tag of tags) {
                // let t = Plugin.parseTag(tag);
                // tags.push(t);
                let val = '';
                switch (tag.type) {
                    case 'Image':
                        msg += `<a href="${tag.url}">[图片]</a>`;
                        break;
                    case 'Plain':
                        if (!tag.text.match(/\[\[(?:.*)](?:.*)]请使用最新版本手机QQ查看/)) {
                            msg += tag.text;
                        }
                        break;
                    case 'At':
                        msg += tag.display.replace('@', '🌀');
                        break;
                    case 'Quote':
                        msg += 'Re: ';
                        break;
                    case 'Face':
                        msg += '[' + tag.name + ']';
                        break;
                    case 'App':
                        let content = tag.content;
                        debug(content);
                        content = JSON.parse(content);
                        // if (content.view !== 'music') {
                        let detail_1 = content.meta.detail_1 || content.meta.news || content.meta.music;
                        val = `<a href="${detail_1.qqdocurl || detail_1.jumpUrl}">${detail_1.desc || detail_1.title}</a>`;
                        msg += val;
                        // }
                        break;
                    // case 'rich':
                    //     if (!!t.attrs.url) {
                    //         val = `<a href="${t.attrs.url}">${t.attrs.text}</a>`;
                    //     } else {
                    //         let content = t.attrs.content;
                    //         content = JSON.parse(content.replace(/&#44;/g, ','));
                    //         val = `<a href="${content.news.jumpUrl}">${content.news.title}</a>`;
                    //     }
                    //     msg = msg.replace(tag, val);
                    //     break;
                    // case 'music':
                    //     let url = '';
                    //     switch (t.attrs.type) {
                    //         case 'qq':
                    //             url = `https://y.qq.com/n/yqq/song/${t.attrs.id}_num.html`;
                    //             break;
                    //         case '163':
                    //             url = `http://music.163.com/song/${t.attrs.id}`;
                    //             break;
                    //         case 'xiami':
                    //             url = `https://www.xiami.com/song/${t.attrs.id}`;
                    //             break;
                    //     }
                    //     val = `${url}`;
                    //     msg = msg.replace(tag, val);
                    //     break;
                    // case 'dice':
                    //     val = `🎲 ${t.attrs.type}`;
                    //     msg = msg.replace(tag, val);
                    //     break;
                    // case 'rps':
                    //     val = `猜拳 ${t.attrs.type === 1 ? '✊🏻' : t.attrs.type === 2 ? '✌🏻' : '✋🏻'}`;
                    //     msg = msg.replace(tag, val);
                    //     break;
                    // case 'share':
                    //     val = `<a href="${t.attrs.url}">${t.attrs.title}</a>`;
                    //     msg = msg.replace(tag, val);
                    //     break;
                }
            }
        }
        return {tags, text: msg};
    }

    getLinkedIDByGroupID(group_id) {
        return this.getGroupSetting(group_id, 'linked_id')
    }

    getGroupIDByLinkedID(linked_id) {
        let json = fs.readFileSync(configpath, 'utf8');
        let groups = !!json ? JSON.parse(json) : [];
        let group = groups.find(a => a.linked_id && (a.linked_id.toString() === linked_id.toString()));
        if (!!group) {
            return group.group_id
        } else {
            return null
        }
    }

    setGroupLinkedID(group_id, linked_id) {
        this.setGroupSetting(group_id, 'linked_id', linked_id)
    }

    getGroupSetting(group_id, key) {
        let json = fs.readFileSync(configpath, 'utf8');
        let groups = !!json ? JSON.parse(json) : [];
        let group = groups.find(a => a.group_id.toString() === group_id.toString());
        if (!!group) {
            return group[key];
        } else {
            return null;
        }
    }

    setGroupSetting(group_id, key, value) {
        let json = fs.readFileSync(configpath, 'utf8');
        let groups = !!json ? JSON.parse(json) : [];
        let group = groups.find(a => a.group_id.toString() === group_id.toString());
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

module.exports = Plugin;
