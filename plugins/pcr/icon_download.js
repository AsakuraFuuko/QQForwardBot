const fs = require('fs');
const requestPromise = require('request-promise');
const DWebp = require('cwebp').DWebp;
const Path = require('path');

let names = {
    "100131": "ヒヨリ",
    "100231": "ユイ",
    "100331": "レイ",
    "100431": "ミソギ",
    "100531": "マツリ",
    "100631": "アカリ",
    "100731": "ミヤコ",
    "100831": "ユキ",
    "100931": "アンナ",
    "101031": "マホ",
    "101131": "リノ",
    "101231": "ハツネ",
    "101331": "ナナカ",
    "101431": "カスミ",
    "101531": "ミサト",
    "101631": "スズナ",
    "101731": "カオリ",
    "101831": "イオ",
    "102031": "ミミ",
    "102131": "クルミ",
    "102231": "ヨリ",
    "102331": "アヤネ",
    "102531": "スズメ",
    "102631": "リン",
    "102731": "エリコ",
    "102831": "サレン",
    "102931": "ノゾミ",
    "103031": "ニノン",
    "103131": "シノブ",
    "103231": "アキノ",
    "103331": "マヒル",
    "103431": "ユカリ",
    "103631": "キョウカ",
    "103731": "トモ",
    "103831": "シオリ",
    "104031": "アオイ",
    "104231": "チカ",
    "104331": "マコト",
    "104431": "イリヤ",
    "104531": "クウカ",
    "104631": "タマキ",
    "104731": "ジュン",
    "104831": "ミフユ",
    "104931": "シズル",
    "105031": "ミサキ",
    "105131": "ミツキ",
    "105231": "リマ",
    "105331": "モニカ",
    "105431": "ツムギ",
    "105531": "アユミ",
    "105631": "ルカ",
    "105731": "ジータ",
    "105831": "ペコリーヌ",
    "105931": "コッコロ",
    "106031": "キャル",
    "106131": "ムイミ",
    "106331": "アリサ",
    "106531": "カヤ",
    "106631": "イノリ",
    "106731": "ホマレ",
    "106831": "ラビリスタ",
    "107031": "ネネカ",
    "107131": "クリスティーナ",
    "107531": "ペコリーヌ（サマー）",
    "107631": "コッコロ（サマー）",
    "107731": "スズメ（サマー）",
    "107831": "キャル（サマー）",
    "107931": "タマキ（サマー）",
    "108031": "ミフユ（サマー）",
    "108131": "シノブ（ハロウィン）",
    "108231": "ミヤコ（ハロウィン）",
    "108331": "ミサキ（ハロウィン）",
    "108431": "チカ（クリスマス）",
    "108531": "クルミ（クリスマス）",
    "108631": "アヤネ（クリスマス）",
    "108731": "ヒヨリ（ニューイヤー）",
    "108831": "ユイ（ニューイヤー）",
    "108931": "レイ（ニューイヤー）",
    "109031": "エリコ（バレンタイン）",
    "109131": "シズル（バレンタイン）",
    "109231": "アン",
    "109331": "ルゥ",
    "109431": "グレア",
    "109531": "クウカ（オーエド）",
    "109631": "ニノン（オーエド）",
    "109731": "レム",
    "109831": "ラム",
    "109931": "エミリア",
    "110031": "スズナ（サマー）",
    "110131": "イオ（サマー）",
    "110231": "ミサキ（サマー）",
    "110331": "サレン（サマー）",
    "110431": "マコト（サマー）",
    "110531": "カオリ（サマー）",
    "110631": "マホ（サマー）",
    "110731": "アオイ（編入生）",
    "110831": "クロエ",
    "110931": "チエル",
    "111031": "ユニ",
    "111131": "キョウカ（ハロウィン）",
    "111231": "ミソギ（ハロウィン）",
    "111331": "ミミ（ハロウィン）",
    "111431": "ルナ",
    "111531": "クリスティーナ（クリスマス）",
    "111631": "ノゾミ（クリスマス）",
    "111731": "イリヤ（クリスマス）",
    "111831": "ペコリーヌ（ニューイヤー）",
    "111931": "コッコロ（ニューイヤー）",
    "112031": "キャル（ニューイヤー）",
    "112131": "スズメ（ニューイヤー）",
    "112231": "カスミ（マジカル）",
    "112331": "シオリ（マジカル）",
    "112431": "ウヅキ（デレマス）",
    "112531": "リン（デレマス）",
    "112631": "ミオ（デレマス）",
    "180431": "ペコリーヌ（プリンセス）",
    "190831": "カリン",
    "191231": "ペテルギウス"
};
let func = (async () => {

    let chapters = fs.readFileSync('chapters.json');
    chapters = JSON.parse(chapters.toString());

    for (let chapter of chapters) {
        // let name_jp = chapter.name_jp;
        // let id = getKeyByValue(names, name_jp);
        console.log(chapter.id, chapter.cn_name);
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
                return decoder.write('./img/3/' + (chapter.id + 30) + '31.png')
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

    console.log('all download')

    // console.log(JSON.stringify(chapters, ' ', 2));
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
        console.error(err);
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
