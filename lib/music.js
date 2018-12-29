'use strict';
const debug = require('debug')('music');
const musicAPI = require("music-api");
const requestPromise = require('request-promise');

class Music {
    search(keywords) {
        return musicAPI.searchSong('qq', {
            key: keywords,
            limit: 1,
            page: 1
        }).then((data) => {
            debug(data);
            let songs = data.success && data.songList;
            let songCount = data.total;
            let array = [];
            if (!songs || songCount === 0) {
                return -1;
            } else {
                return songs[0].id
            }
        })
    }
}

module.exports = new Music();
