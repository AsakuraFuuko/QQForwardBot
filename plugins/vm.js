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

            Plugin.onText(/(vm)(?!\|)?(.*)/, context.message, (msg, match) => {
                e.stopPropagation();
                if (!match[2]) {
                    this.qqbot('send_msg', {group_id: context.group_id, user_id: context.user_id, message: '什么都没有'});
                    return false
                }
                let script = match[2].trim();
                let result = this.vm.run(script);
                if (!!result) {
                    this.qqbot('send_msg', {group_id: context.group_id, user_id: context.user_id, message: result});
                }
            });
        })
    }
}

module.exports = VMPlugin;
