const debug = require('debug')('plugin_qqforward');
const Plugin = require('./plugin');
const MusicAPI = require('../lib/music');

class Music extends Plugin {
    constructor(params) {
        super(params);
    }

    init() {
        this.qqbot.on('message', async (e, context, tags) => {
            debug(context);
            debug(tags);

            Plugin.onText(/(我要听)(?! )?(.*)/, context.message, (msg, match) => {
                e.stopPropagation();
                if (!match[2]) {
                    this.qqbot('send_group_msg', {group_id: context.group_id, message: '你要听什么~'});
                    return false
                }
                let keywords = match[2].trim();
                MusicAPI.search(keywords).then((id) => {
                    if (id !== -1) {
                        this.qqbot('send_group_msg', {
                            group_id: context.group_id, message: {
                                type: 'music',
                                data: {id, type: 'qq'}
                            }
                        })
                    } else {
                        this.qqbot('send_group_msg', {group_id: context.group_id, message: '没找到~'});
                    }
                })
            })
        })
    }
}

module.exports = Music;
