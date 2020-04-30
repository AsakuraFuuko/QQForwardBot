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
}

module.exports = new Utils();
