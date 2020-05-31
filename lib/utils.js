class Utils {
    getRandomString() {
        return Math.random().toString(36).substr(2, 5)
    }

    randomChoice(arr) {
        let index = Math.floor(Math.random() * arr.length);
        return arr[index];
    }

    random() {
        return Math.random()
    }

    removeArrayItem(array, item) {
        let index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
        return array
    }

    shuffledArrayItem(array) {
        let shuffledArray = [];
        let stop = false;
        while (stop === false) {
            if (array.length < 1) stop = true;
            else {
                let index = Math.floor(Math.random() * array.length);
                let item = array[index];
                array.splice(index, 1);
                shuffledArray.push(item);
                stop = false;
            }
        }
        return shuffledArray;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getUnixTimestamp(date = new Date()) {
        return Math.round(date.getTime() / 1000)
    }

    unixTimestampToDate(timestamp) {
        return new Date(timestamp * 1000)
    }
}

module.exports = new Utils();
