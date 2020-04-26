'use strict';

class Utils {
    getRandomString() {
        return Math.random().toString(36).substr(2, 5)
    }
}

module.exports = new Utils();
