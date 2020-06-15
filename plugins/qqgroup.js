const debug = require('debug')('plugin_qqgroup');
const Mirai = require('node-mirai-sdk');
const Plugin = require('./plugin');

const {Plain, At} = Mirai.MessageComponent;

class QQGroup extends Plugin {
    constructor(params) {
        super(params);
    }

    init() {
        this.qqbot.onMessage(async (message) => {
            debug(message);
            let type = message.type;
            let permission = message.sender.permission;
            if (type === 'GroupMessage' && (permission === 'ADMINISTRATOR' || permission === 'OWNER')) {
                let group_id = message.sender.group.id;
                Plugin.onText(/设置欢迎消息[\n ]?(?<welcome>.*)/, message, async (msg, match) => {
                    let welcome = match.groups.welcome;
                    if (!welcome) {
                        return this.qqbot.sendGroupMessage([Plain('消息为空')], group_id).then((message) => debug(message))
                    } else {
                        this.setWelcomeMessage(group_id, welcome);
                        return this.qqbot.sendGroupMessage([Plain('设置为\n'), Plain(welcome)], group_id).then((message) => debug(message))
                    }
                });

                Plugin.onText(/启用欢迎/, message, async (msg, match) => {
                    this.enableWelcome(group_id);
                    return this.qqbot.sendGroupMessage([Plain('已启用欢迎')], group_id).then((message) => debug(message))
                })

                Plugin.onText(/禁用欢迎/, message, async (msg, match) => {
                    this.disableWelcome(group_id)
                    return this.qqbot.sendGroupMessage([Plain('已启用欢迎')], group_id).then((message) => debug(message))
                })
            }
        })

        this.qqbot.onEvent('memberJoin', async (message) => {
            debug(message)
            let group_id = message.member.group.id;
            let qq = message.member.id;
            if (this.isEnableWelcome(group_id)) {
                let msg = this.parseWelcomeMessage(this.getWelcomeMessage(group_id), qq);
                await this.qqbot.sendGroupMessage(msg, group_id).then((message) => debug(message))
                await this.qqbot.setGroupMute(group_id, qq, 60).then((message) => debug(message))
            }
        })
    }

    parseWelcomeMessage(msg, at_qq) {
        return msg.split('#').filter(m => !!m).map(m => {
            if (m === 'at') {
                return At(at_qq)
            } else {
                return Plain(m)
            }
        })
    }

    setWelcomeMessage(group_id, message) {
        this.setGroupSetting(group_id, 'welcome_msg', message)
    }

    getWelcomeMessage(group_id) {
        return this.getGroupSetting(group_id, 'welcome_msg');
    }

    enableWelcome(group_id) {
        this.setGroupSetting(group_id, 'enable_welcome', true)
    }

    disableWelcome(group_id) {
        this.setGroupSetting(group_id, 'enable_welcome', false)
    }

    isEnableWelcome(group_id) {
        return !!this.getGroupSetting(group_id, 'enable_welcome')
    }
}

module.exports = QQGroup;
