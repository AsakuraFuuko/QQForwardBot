'use strict';
const debug = require('debug')('music');
const musicAPI = require("music-api");
const requestPromise = require('request-promise');

class Music {
    search(keywords) {
        return musicAPI.searchSong('qq', {
            key: keywords,
            limit: 1,
            page: 1,
            raw: true
        }).then((json) => {
            debug(json);
            let songs = json.code === 0 && json.data.song.list;
            let songCount = json.data.totalnum;
            let array = [];
            if (!songs || songCount === 0) {
                return -1;
            } else {
                debug(songs);
                return songs[0].songid
            }
        })
    }
}

module.exports = new Music();
