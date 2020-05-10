let site = 'tw';

let chapters = require('./chapters');

console.log(JSON.stringify(chapters.star_1.filter(u => !!u[site + '_name']).map(u => u[site + '_name'])));
console.log(JSON.stringify(chapters.star_2.filter(u => !!u[site + '_name']).map(u => u[site + '_name'])));
console.log(JSON.stringify(chapters.star_3.filter(u => !!u[site + '_name']).map(u => u[site + '_name'])));
console.log(JSON.stringify(chapters.limited_1.filter(u => !!u[site + '_name']).map(u => u[site + '_name'])));
console.log(JSON.stringify(chapters.limited_3.filter(u => !!u[site + '_name']).map(u => u[site + '_name'])));
