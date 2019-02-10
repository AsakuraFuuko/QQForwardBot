const debug = require('debug')('plugin_other');
const Plugin = require('./plugin');

class Other extends Plugin {
    constructor(params) {
        super(params);
    }

    init() {
        this.qqbot.on('message', async (e, context, tags) => {
            debug(context);
            debug(tags);

            Plugin.onText(/骰子|roll|CQ:dice/, context.message, (msg, match) => {
                e.stopPropagation();
                setTimeout(() => this.qqbot('send_msg', {
                    group_id: context.group_id,
                    user_id: context.user_id,
                    message: {
                        type: 'dice',
                        data: {type: 1}
                    }
                }), 1000);
            });

            Plugin.onText(/猜拳|rps|CQ:rps/, context.message, (msg, match) => {
                e.stopPropagation();
                setTimeout(() => this.qqbot('send_msg', {
                    group_id: context.group_id,
                    user_id: context.user_id,
                    message: {
                        type: 'rps',
                        data: {type: 1}
                    }
                }), 1000);
            })
        })
    }
}

module.exports = Other;
