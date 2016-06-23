/**
 * Script for crawling articles from a news site (specificly: Kompas).
 *
 * @param {string} file Full path of the file used as program output (articles data).
 */

'use strict';

var _      = require('lodash'),
    fs     = require('fs'),
    prompt = require('prompt'),
    jsfile = require('jsonfile'),
    assert = require('assert');

// var kompas = require('indonesian-news-scraper').Kompas,
var kompas = require(__dirname + '/CustomKompas.js'),
    helper = require(__dirname + '/../util/helper.js');

var currDate = new Date();
kompas.setDesiredDate(currDate.getDate(), currDate.getMonth(), currDate.getFullYear());

// Main Logic Variables
var docFile = (process.argv.length > 2 ? process.argv[2] : 'out/articles/test.json'),
    index   = 0;

prompt.start();
waitForCommandInput();

/**
 * Recursively wait for program command input.
 */
function waitForCommandInput() {
    /**
     * Print menu & request input.
     */
    function getCommandInput() {
        prompt.get(['command'], function (err, input) {
            if (err) {
                console.log(err);
                return 1;
            }

            console.log();
            processCmd(input.command);
        });
    }

    /**
     * Process command.
     *
     * @param {string} command Command string
     */
    function processCmd(command) {
        var cmd = command.split(' ');

        switch (cmd[0]) {
            case 'check':
                var result = 'date          : ' + currDate.getDate() + '/' + currDate.getMonth()  + '/' + currDate.getFullYear() + '\n';
                result += 'file path     : ' + docFile + '\n';
                result += 'index         : ' + index;

                console.log(result);
                break;

            case 'clear':
                helper.clearScreen();
                break;

            case 'date':
                currDate.setFullYear(cmd[3], cmd[2], cmd[1])
                kompas.setDesiredDate(currDate.getDate(), currDate.getMonth(), currDate.getFullYear());
                console.log('date set.');
                break;

            case 'file':
                docFile = cmd[1];
                console.log('file set.');
                break;

            case 'index':
                index = cmd[1];
                console.log('article index set.');
                break;

            case 'h':
                printMenu();
                break;

            case 'page':
                kompas.setDesiredPage(cmd[1]);
                console.log('page set.');
                break;

            case 'scrap':
                console.log('start Scraping ..');
                startScrapper(cmd[1], function (data) {
                    console.log('Scraping finished.');

                    jsfile.writeFile(docFile, data, {spaces: 4}, function (err) {
                        assert.equal(err, null);
                    });
                });
                break;

            case 'exit':
                process.exit(0);
        }

        console.log();
        getCommandInput();
    }

    console.log('Type \'h\' to show full command list.');
    getCommandInput();
}

/**
 * Print command list menu.
 */
function printMenu() {
    var menu = 'check                      - check program\'s variables\n';
        menu += 'clear                      - clear screen\n';
        menu += 'date  <day> <month> <year> - set article date to scrape from\n';
        menu += 'file  <file path>          - set file output for scraped data\n';
        menu += 'index <number>             - set article index\n';
        menu += 'page  <number>             - set page to scrape from\n';
        menu += 'scrape <article limit>     - start scraping\n';
        menu += 'exit                       - exit program';

    console.log(menu);
}

/**
 * @typedef Article
 * @type {Object}
 * @property {string} index    Article's identifier
 * @property {string} category Article's Category
 * @property {string} title    Article's title
 * @property {string} date     Article's date
 * @property {string} content  Article's content
 */

/**
 * Callback for when finished scraping the web for articles.
 *
 * @callback scrapeFinish
 * @param {Array.<Article>} articles Articles scraped from a web
 */

/**
 * Start scrap process.
 *
 * @param {number}       scrapLimit Article's scrap limit
 * @param {scrapeFinish} [callback] Callback function
 */
function startScrapper(scrapLimit, callback) {
    /**
     * The scrap process logic.
     */
    function doScrape() {
        console.log('Article Count  : ' + articles.length);
        console.log('URL in process : ' + kompas.getBaseURL());

        kompas.scrap().then(function (scraps) {
            scraps.forEach(function (news) {
                if (!news.content || scrapLimit == articles.length) {
                    return;
                }

                var article = {
                    index: news.source + '-' + (++index),
                    category: news.category,
                    title: news.title,
                    date: news.date,
                    content: news.content
                };

                articles.push(article);
            });

            console.log(scraps.length + ' articles scraped.');

            // Process next batch (or page) of articles.
            if (scraps.length < 10) {
                // Change date when current scraps result is little than 10 (should work on most case).
                currDate.setDate(currDate.getDate() - 1);
                kompas.setDesiredDate(currDate.getDate(), currDate.getMonth(), currDate.getFullYear());
                kompas.resetPage();
            } else {
                // Go to next page.
                kompas.nextPage();
            }

            // Decide whether to continue scrap or not.
            if (scrapLimit > articles.length) {
                console.log();
                doScrape();
            } else if (scrapLimit <= articles.length) {
                if (_.isFunction(callback)) callback(articles);
            }
        });
    }

    var articles = new Array();
    doScrape();
}
