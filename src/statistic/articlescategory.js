/**
 * Output the statistics (category) of the articles.
 */

'use strict';

var _      = require('lodash'),
    jsFile = require('jsonfile');

const ARTICLE_FILES = [
    __dirname + '/../../out/articles/data.json',
    __dirname + '/../../out/articles/data2.json',
    __dirname + '/../../out/articles/data3.json',
    __dirname + '/../../out/articles/data4.json',
    __dirname + '/../../out/articles/data5.json'
];

// Main.
main();

/**
 * Main logic container.
 */
function main() {
    var categories = new Object();

    ARTICLE_FILES.forEach(function (file, fileIndex) {
        jsFile.readFile(file, function (err, articles) {
            articles.forEach(function (article) {
                if (_.has(categories, article.category)) {
                    categories[article.category]++;
                } else {
                    categories[article.category] = 1;
                }
            });

            if (fileIndex + 1 == ARTICLE_FILES.length) {
                let result = _.chain(categories)
                    .map(function (frequency, category) {
                        return {
                            name: category,
                            frequency: frequency
                        };
                    })
                    .orderBy(['frequency'], ['desc'])
                    .value();

                console.log(':: Articles Statistic ::');
                result.forEach(function (category, index) {
                    console.log(`${index + 1}. ${category.name} - ${category.frequency}`);
                });
            }
        });
    });
}
