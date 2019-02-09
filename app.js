'use strict';
const debug = require('debug')('chinonyanbot');
const TelegramBot = require('node-telegram-bot-api');
const {CQWebSocket} = require('cq-websocket');

const Config = require('./lib/config');

const PluginQQForward = require('./plugins/qqforward');
const PluginMusic = require('./plugins/music');

const tgbot = new TelegramBot(Config.tgbot.token, {polling: true});

let botname = '@' + Config.tgbot.username;

tgbot.getMe().then((msg) => {
    botname = '@' + msg.username;
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
// other end

// qqbot start
const qqbot = new CQWebSocket({
    host: Config.qqbot.ws_host,
    port: Config.qqbot.ws_port,
    accessToken: Config.qqbot.token
});
qqbot
// 連線例外處理
    .on('socket.error', console.error)
    .on('socket.connecting', (wsType) => console.log('[%s] 建立連線中, 請稍後...', wsType))
    .on('socket.connect', (wsType, sock, attempts) => console.log('[%s] 連線成功 ヽ(✿ﾟ▽ﾟ)ノ 蛆蛆%d個嘗試', wsType, attempts))
    .on('socket.failed', (wsType, attempts) => console.log('[%s] 連線失敗 。･ﾟ･(つд`ﾟ)･ﾟ･ [丑%d] 對噗起', wsType, attempts))
    .on('api.response', (resObj) => console.log('伺服器響應: %O', resObj))
    .on('socket.close', (wsType, code, desc) => console.log('[%s] 連線關閉(%d: %s)', wsType, code, desc))
    .on('ready', () => console.log('今天又是複讀複讀的一天 ｡:.ﾟヽ(*´∀`)ﾉﾟ.:｡'))
    .on('message.private', (e, context) => {
        tgbot.sendMessage(Config.tgbot.admin, context.message)
    });
// plugins

new PluginMusic({tgbot, Config, qqbot});
new PluginQQForward({tgbot, Config, qqbot});

qqbot.connect();

process.on('unhandledRejection', (reason) => {
    console.error(reason);
    //   process.exit(1);
});
