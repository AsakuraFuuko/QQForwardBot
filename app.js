'use strict';
// const debug = require('debug')('qqforward');
const TelegramBot = require('node-telegram-bot-api');
const Mirai = require('node-mirai-sdk');

const Config = require('./lib/config');

const PluginQQForward = require('./plugins/qqforward');
const PluginQQGroup = require('./plugins/qqgroup');
// const PluginMusic = require('./plugins/music');
// const PluginKanColleTime = require('./plugins/kancolletime');
// const PluginOther = require('./plugins/other');

const PluginPCRGacha = require('./plugins/pcr/gacha');
const PluginPCRGuild = require('./plugins/pcr/guild');
const PluginPCRTools = require('./plugins/pcr/tools');

const tgbot = new TelegramBot(Config.tgbot.token, {polling: true});

let botname = '@' + Config.tgbot.username;

tgbot.getMe().then((msg) => {
    botname = '@' + msg.username;
    require('./lib/error')(tgbot, process.env.ERROR_CHANNEL);
});

// other start
tgbot.onText(/\/start(@\w+)?/, (msg, match) => {
    let chat_id = msg.chat.id;
    let bot_name = match[1];
    if (bot_name && bot_name !== botname) {
        return;
    }
    console.log('start', msg.from);
    return tgbot.sendMessage(chat_id, '喵~')
});

tgbot.onText(/\/debug(@\w+)?/, (msg, match) => {
    let chat_id = msg.chat.id;
    let bot_name = match[1];
    if (bot_name && bot_name !== botname) {
        return;
    }
    return tgbot.sendMessage(chat_id, JSON.stringify(msg, null, 2))
});

tgbot.onText(/\/clean_data(@\w+)?/, (msg, match) => {
    let chat_id = msg.chat.id;
    let bot_name = match[1];
    if (bot_name && bot_name !== botname) {
        return;
    }
    qqbot('clean_data_dir', {
        data_dir: 'image'
    }).then((res) => {
        console.log(res);
        return tgbot.sendMessage(chat_id, JSON.stringify(res, null, 2))
    });
    // return tgbot.sendMessage(chat_id, JSON.stringify(msg, null, 2))
});

tgbot.on("polling_error", (err) => console.log(err));
// other end

// qqbot start
const qqbot = new Mirai({
    host: 'http://' + Config.qqbot.ws_host + ':' + Config.qqbot.ws_port,
    authKey: Config.qqbot.token,
    qq: Config.qqbot.account,
    interval: Config.qqbot.delay,
    enableWebsocket: Config.qqbot.ws
});

qqbot.onSignal('authed', () => {
    console.log(`Authed with session key ${qqbot.sessionKey}`);
    qqbot.verify();
});

qqbot.onSignal('verified', async () => {
    console.log(`Verified with session key ${qqbot.sessionKey}`);
    const friendList = await qqbot.getFriendList();
    const groupList = await qqbot.getGroupList();
    console.log(`There are ${friendList.length} friends, ${groupList.length} groups in bot`);
});

// new PluginMusic({tgbot, Config, qqbot});
// new PluginKanColleTime({tgbot, Config, qqbot});
// new PluginOther({tgbot, Config, qqbot});

new PluginPCRGacha({tgbot, Config, qqbot, botname});
new PluginPCRGuild({tgbot, Config, qqbot, botname});
new PluginPCRTools({tgbot, Config, qqbot, botname});

new PluginQQGroup({tgbot, Config, qqbot, botname});
new PluginQQForward({tgbot, Config, qqbot, botname});
qqbot.listen('all');

process.on('unhandledRejection', (reason) => {
    console.error(reason);
    //   process.exit(1);
});

process.on('exit', () => {
    qqbot.release();
});
