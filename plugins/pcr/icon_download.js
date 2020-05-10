const fs = require('fs');
const requestPromise = require('request-promise');
const DWebp = require('cwebp').DWebp;

let func = (async () => {
    let chapters = JSON.parse(fs.readFileSync('chapters.json').toString());
    let chapters2 = Object.values(chapters).flat(Infinity);

    for (let chapter of chapters2) {
        // let name_jp = chapter.name_jp;
        // let id = getKeyByValue(names, name_jp);
        console.log(chapter.id, chapter.jp_name);
        await download('https://redive.estertion.win/icon/unit/' + (chapter.id + 10) + '.webp', './img/1/' + (chapter.id + 10) + '.webp').then((result) => {
            if (result) {
                let file = fs.createReadStream('./img/1/' + (chapter.id + 10) + '.webp');
                let decoder = new DWebp(file);
                return decoder.write('./img/1/' + (chapter.id + 10) + '.png')
                    .then(() => download('https://redive.estertion.win/icon/unit/' + (chapter.id + 30) + '.webp', './img/3/' + (chapter.id + 30) + '.webp'))
            }
        }).then((result) => {
            if (result) {
                let file = fs.createReadStream('./img/3/' + (chapter.id + 30) + '.webp');
                let decoder = new DWebp(file);
                return decoder.write('./img/3/' + (chapter.id + 30) + '.png')
                    .then(() => download('https://redive.estertion.win/icon/unit/' + (chapter.id + 60) + '.webp', './img/6/' + (chapter.id + 60) + '.webp'))
            }
        }).then((result) => {
            if (result) {
                let file = fs.createReadStream('./img/6/' + (chapter.id + 60) + '.webp');
                let decoder = new DWebp(file);
                return decoder.write('./img/6/' + (chapter.id + 60) + '.png')
                    .then(() => chapter.max_star = 6)
            } else {
                chapter.max_star = 5
            }
        })
    }

    console.log('all download');

    console.log(JSON.stringify(chapters, ' ', 2));
    // fs.writeFileSync('chapters.json', JSON.stringify(chapters, ' ', 2));
});

func();

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

function download(url, path) {
    return requestPromise.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36'
        },
        encoding: null
    }).then((body) => {
        if (body) {
            fs.writeFileSync(path, body)
        }
        return true
    }).catch((err) => {
        console.error(err.statusCode);
        return false
    })
}

// const cheerio = require('cheerio');
// const $ = cheerio.load(fs.readFileSync('pcr.html').toString());
// let chapters = [];
// for (let id of Object.keys(names)) {
//     let chapter = {};
//     chapter.id = parseInt(id.substr(0, 4));
//     chapter.jp_name = names[id];
//     let tr = $('table tr span:contains(' + chapter.jp_name + ')').parent();
//     chapter.cn_name = tr.find('a').text();
//     chapters.push(chapter);
// }
//
// let chapters2 = [],
//     events = {
//         'サマー': '泳装',
//         'ハロウィン': '万圣节',
//         'クリスマス': '圣诞节',
//         'ニューイヤー': '新年',
//         'バレンタイン': '情人节',
//         'オーエド': '大江户',
//         '編入生': '插班生',
//         'デレマス': 'idol',
//         'プリンセス': '公主',
//         'マジカル': '魔法少女'
//     }, regex = /(.*?)[（|(](.*?)[）|)]/;
// // let chapters = JSON.parse(fs.readFileSync('chapters.json').toString());
// for (let chapter of chapters) {
//     if (!chapter.cn_name) {
//         let m = regex.exec(chapter.jp_name);
//         if (m && m.length > 2) {
//             let cn = chapters.filter(c => c.jp_name === m[1]);
//             if (cn.length === 0) continue;
//             cn = cn[0].cn_name;
//             chapter.cn_name = cn + '（' + events[m[2]] + '）'
//         }
//     }
// }
// fs.writeFileSync('chapters.json', JSON.stringify(chapters, ' ', 2));
