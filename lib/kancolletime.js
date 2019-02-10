const cheerio = require('cheerio');
const requestPromise = require('request-promise');

const URL = "https://zh.kcwiki.org/wiki/";
const TIMEWORD = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

//#mw-content-text > div > table:nth-child(15) > tbody > tr:nth-child(2) > td:nth-child(3)

class KanColleTime {

    static async get(shipname, hour) {
        return requestPromise.get(URL + encodeURIComponent(shipname)).then(body => {
            let $ = cheerio.load(body);
            let data = $('#mw-content-text > div > table.wikitable > tbody > tr > td').filter((i, el) => {
                // console.log($(el).text());
                return $(el).text().trim() === KanColleTime.getHourStr(hour) + '〇〇时报';
            });
            let audio = data.parent().find('a[data-filesrc]').attr('data-filesrc');
            let jastr = data.parent().find('td[lang=ja]').text().trim();
            let cnstr = data.parent().next().text().trim();
            return {time: hour, audio, ja: jastr, cn: cnstr, ship: shipname}
        })
    }

    static getHourStr(hour) {
        let hourstr = '';
        hour = KanColleTime.zfill(hour, 2);
        hour.split('').map(a => hourstr += TIMEWORD[parseInt(a)]);
        return hourstr
    }

    static zfill(num, size) {
        let s = "000000000" + num;
        return s.substr(s.length - size);
    }
}

module.exports = KanColleTime;
