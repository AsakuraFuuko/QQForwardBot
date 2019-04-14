const debug = require('debug')('plugin');
const CQTAGS_EXTRACTOR = /\[CQ[^\]]*]/g;
const CQTAG_ANALYSOR = /\[CQ:(.*)*]/;

class Plugin {
    constructor(params) {
        this.tgbot = params.tgbot;
        this.Config = params.Config;
        this.qqbot = params.qqbot;
        this.botname = params.botname;
        this.init();
    }

    init() {

    }

    static onText(regex, message, callback) {
        debug('Matching %s with %s', message, regex);
        const result = regex.exec(message);
        if (!result) {
            return false;
        }
        regex.lastIndex = 0;
        debug('Matches %s', regex);
        callback(message, result);
    }

    async parseMessage(msg) {
        let tags = [];
        let matchs = msg.match(CQTAGS_EXTRACTOR);
        if (matchs != null) {
            for (let tag of matchs) {
                let t = Plugin.parseTag(tag);
                tags.push(t);
                let val = '';
                switch (t.type) {
                    case 'image':
                        val = `<a href="${t.attrs.url}">[图片]</a>`;
                        msg = msg.replace(tag, val);
                        break;
                    case 'at':
                        let nickname = await this.qqbot('get_stranger_info', {user_id: t.attrs.qq});
                        nickname = nickname.data.nickname;
                        val = `🌀${nickname}`;
                        msg = msg.replace(tag, val);
                        break;
                    case 'rich':
                        val = `<a href="${t.attrs.url}">${t.attrs.text}</a>`;
                        msg = msg.replace(tag, val);
                        break;
                    case 'music':
                        let url = '';
                        switch (t.attrs.type) {
                            case 'qq':
                                url = `https://y.qq.com/n/yqq/song/${t.attrs.id}_num.html`;
                                break;
                            case '163':
                                url = `http://music.163.com/song/${t.attrs.id}`;
                                break;
                            case 'xiami':
                                url = `https://www.xiami.com/song/${t.attrs.id}`;
                                break;
                        }
                        val = `${url}`;
                        msg = msg.replace(tag, val);
                        break;
                    case 'dice':
                        val = `🎲 ${t.attrs.type}`;
                        msg = msg.replace(tag, val);
                        break;
                    case 'rps':
                        val = `猜拳 ${t.attrs.type === 1 ? '✊🏻' : t.attrs.type === 2 ? '✌🏻' : '✋🏻'}`;
                        msg = msg.replace(tag, val);
                        break;
                }
            }
        }
        return {msg, tags};
    }

    static parseTag(tag) {
        let groups = tag.match(CQTAG_ANALYSOR);
        let type = '', attrs = {};
        for (let match of groups[1].split(',')) {
            if (!match.includes('=')) {
                type = match
            } else {
                let key = match.split('=')[0];
                attrs[key] = match.split('=')[1]
            }
        }
        return {type, attrs}
    }

}

module.exports = Plugin;
