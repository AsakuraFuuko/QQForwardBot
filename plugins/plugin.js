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
                        msg += tag.text;
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
                        if (content.view !== 'music') {
                            let detail_1 = content.meta.detail_1;
                            val = `<a href="${detail_1.qqdocurl}">${detail_1.desc}</a>`;
                            msg += val;
                        }
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

}

module.exports = Plugin;
