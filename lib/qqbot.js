'use strict';
const debug = require('debug')('qqbot');
const http = require('http');
const requestPromise = require('request-promise');

class QQBot {
    constructor(host, port, api_url, token) {
        this.port = port;
        this.host = host;
        this.token = token;
        this.server = http.createServer((req, res) => this.onResopnse(req, res, this));
        this.qqbot_api_url = api_url;
        this.users = {}
    }

    onResopnse(req, res, self) {
        let queryData = "";
        req.on('data', (data) => {
            queryData += data;
        });
        req.on('end', () => {
            debug(JSON.parse(queryData));
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            res.end('okay');
            if (req.method === 'POST' && req.url === '/msg' && req.headers.authorization === 'token ' + self.token && self.Message) {
                self.Message(JSON.parse(queryData))
            }
        })
    }

    onMessage(callback) {
        this.Message = callback
    }

    sendGroupMessage(group_id, message) {
        // type [buddy,group,discuss]
        const path = '/send_group_msg';
        const options = {
            url: this.qqbot_api_url + path,
            form: {
                group_id: group_id,
                message: message,
                is_raw: false
            },
            headers: {
                'Authorization': 'token ' + this.token
            }
        };
        return requestPromise.post(options).then((body) => {
            debug(body);
            return body
        }).catch((err) => {
            debug(err)
        })
    }

    getUser(user_id, group_id) {
        return new Promise((resolve) => {
            if (user_id in this.users) {
                resolve(this.users[user_id])
            } else {
                resolve(null)
            }
        }).then((name) => {
            if (name) {
                return name
            } else if (group_id) {
                return this.getGroupMemberInfo(group_id, user_id, true).then((nickname) => {
                    if (nickname) {
                        console.log('[QQBot] request user nickname ' + user_id + ':' + nickname);
                        this.users[user_id] = nickname;
                        return nickname
                    }
                    return user_id
                })
            }
        })
    }

    getGroupMemberInfo(group_id, user_id, no_cache = false) {
        const path = '/get_group_member_info';
        const options = {
            url: this.qqbot_api_url + path,
            form: {
                group_id: group_id,
                user_id: user_id,
                no_cache: no_cache
            },
            headers: {
                'Authorization': 'token ' + this.token
            }
        };
        return requestPromise.post(options).then((body) => {
            debug(body);
            let obj = JSON.parse(body);
            if (obj.status === 'ok') {
                return obj.data.card + '(' + obj.data.nickname + ')'
            }
        }).catch((err) => {
            debug(err);
            return null
        })
    }

    startListen() {
        console.log('[QQBot] start listen on ' + this.host + ':' + this.port);
        this.server.listen(this.port, this.host)
    }
}

module.exports = QQBot;