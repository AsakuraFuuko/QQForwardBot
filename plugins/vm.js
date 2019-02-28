const debug = require('debug')('plugin_vm');
const {VM} = require('vm2');
const Plugin = require('./plugin');

class VMPlugin extends Plugin {
    constructor(params) {
        super(params);
        this.vm = new VM();
    }

    init() {
        this.qqbot.on('message', async (e, context, tags) => {
            debug(context);
            debug(tags);

            Plugin.onText(/vm(?:\|)?(.*)/, context.message, (msg, match) => {
                e.stopPropagation();
                if (!match[1]) {
                    this.qqbot('send_msg', {group_id: context.group_id, user_id: context.user_id, message: '你要执行什么呢'});
                    return false
                }
                let script = match[1].trim();
                try {
                    let result = this.vm.run(script);
                    if (!!result) {
                        this.qqbot('send_msg', {group_id: context.group_id, user_id: context.user_id, message: result});
                    }
                } catch (e) {
                    this.qqbot('send_msg', {
                        group_id: context.group_id,
                        user_id: context.user_id,
                        message: `发生错误啦\n\n${e}`
                    });
                }
            });
        })
    }
}

module.exports = VMPlugin;
