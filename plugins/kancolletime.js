const debug = require('debug')('plugin_kancolletime');
const cron = require('node-cron');
const fs = require('fs');
const touch = require("touch");
const Plugin = require('./plugin');

const KanColleTimeApi = require('../lib/kancolletime');

const configpath = './data/kancolletime.json';

class KanColleTime extends Plugin {
    constructor(params) {
        super(params);
        this.loop();
        touch(configpath);
    }

    init() {
        this.qqbot.on('message', async (e, context, tags) => {
            debug(context);
            debug(tags);

            Plugin.onText(/启用报时(?! )?(.*)/, context.message, (msg, match) => {
                e.stopPropagation();
                if (!match[1]) {
                    this.qqbot('send_msg', {
                        group_id: context.group_id,
                        user_id: context.user_id,
                        message: '启用报时 [报时船名称]（如：启用报时 夕立)'
                    });
                    return false
                }
                let shipname = match[1].trim();

                this.enable(context.group_id, shipname);
                this.qqbot('send_msg', {
                    group_id: context.group_id,
                    user_id: context.user_id,
                    message: `${shipname} 的报时启用成功`
                });
            });

            Plugin.onText(/停用报时/, context.message, (msg, match) => {
                e.stopPropagation();

                this.disable(context.group_id);
                this.qqbot('send_msg', {
                    group_id: context.group_id,
                    user_id: context.user_id,
                    message: `报时停用成功`
                });
            })
        })
    }

    async sendTimeToGroup(hour, group_id, shipname) {
        debug(`${hour} 时发送 ${shipname} 的报时语音到群 ${group_id}`);
        let ship = await KanColleTimeApi.get(shipname, hour);
        if (!!ship && !!ship.audio) {
            this.qqbot('send_msg', {
                group_id,
                message: {
                    type: 'record',
                    data: {
                        file: ship.audio
                    }
                }
            }).then(() => {
                return this.qqbot('send_msg', {
                    group_id,
                    message: [{
                        type: 'text',
                        data: {
                            text: ship.ja
                        }
                    }, {
                        type: 'text',
                        data: {
                            text: '\n'
                        }
                    }, {
                        type: 'text',
                        data: {
                            text: ship.cn
                        }
                    }]
                })
            })
        } else {
            this.qqbot('send_msg', {
                group_id,
                message: `${shipname} 没有报时语音`
            })
        }
    }

    loop() {
        console.log('开始报时循环');
        cron.schedule('0 * * * *', () => {
            let hour = (new Date()).getHours();
            let groups = JSON.parse(fs.readFileSync(configpath, 'utf8')) || [];
            for (let group of groups) {
                let {group_id, shipname} = group;
                this.sendTimeToGroup(hour, group_id, shipname)
            }
        });
    }

    enable(group_id, shipname) {
        let groups = JSON.parse(fs.readFileSync(configpath, 'utf8')) || [];
        let group = groups.find(a => a.group_id === group_id);
        if (!!group) {
            debug('已存在，替换');
            let index = groups.indexOf(group);
            groups[index] = {group_id, shipname}
        } else {
            groups.push({group_id, shipname})
        }
        fs.writeFileSync(configpath, JSON.stringify(groups))
    }

    disable(group_id) {
        let groups = JSON.parse(fs.readFileSync(configpath, 'utf8')) || [];
        let group = groups.find(a => a.group_id === group_id);
        if (!!group) {
            debug('移除');
            let index = groups.indexOf(group);
            groups.splice(index, 1);
            fs.writeFileSync(configpath, JSON.stringify(groups));
            return true
        } else {
            return false
        }
    }
}

module.exports = KanColleTime;
