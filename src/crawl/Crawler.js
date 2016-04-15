'use strict';

var fs     = require('fs');
var prompt = require('prompt');
// var kompas = require('indonesian-news-scraper').Kompas;
var kompas = require(__dirname + '/CustomKompas.js');
var jsfile = require('jsonfile');

var currDate = new Date();
kompas.setDesiredDate(currDate.getDate(), currDate.getMonth(), currDate.getFullYear());

// Main Logic Variables
var docFile = (process.argv.length > 2 ? process.argv[2] : '');
var index   = 0;

prompt.start();
waitForCommandInput();

/**
 * Recursively wait for program command input.
 *
 * @param  {Function} callback Callback function.
 * @return {void}
 */
function waitForCommandInput(callback) {
    /**
     * Print menu & request input.
     *
     * @return {void}
     */
    function getCommandInput() {
        prompt.get(['command'], function (err, input) {
            if (err) { return onErr(err); }
            console.log();
            processCmd(input.command);
        });
    }

    /**
     * Process command.
     *
     * @param  {string} command Command string
     * @return {void}
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
                clearScreen();
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
                console.log('start scrapping ..');
                startScrapper((cmd[1] != 'undefined' ? cmd[1] : 0), function (data) {
                    console.log('Scrapping finished.');

                    jsfile.writeFile(docFile, data, {spaces: 4}, function (err) {
                        if (err) onErr(err);
                    });
                });
                break;

            case 'exit':
                process.exit(0);
        }

        console.log('\n');
        getCommandInput();
    }

    console.log('Type \'h\' to show full command list.');
    getCommandInput();
}


/**
 * Log error and exit.
 *
 * @param  {string}  err Error message
 * @return {integer}     Exit type
 */
function onErr(err) {
    console.error(err);
    return 1;
}

/**
 * Print command list menu.
 *
 * @return {void}
 */
function printMenu() {
    var menu = 'check                      - check program\'s variables\n';
        menu += 'clear                      - clear screen\n';
        menu += 'date  <day> <month> <year> - set article date to scrap from\n';
        menu += 'file  <file path>          - set file to be appended on scrap\n';
        menu += 'index <number>             - set article index\n';
        menu += 'page  <number>             - set page to scrap from\n';
        menu += 'scrap <?article limit>     - start scrapping (limitable)\n';
        menu += 'exit                       - exit program';

    console.log(menu);
}

/**
 * Clear screen.
 *
 * @return {void}
 */
function clearScreen() {
    var i = 0;
    while (i++ < 60) { console.log() };
}

/**
 * Start scrap process.
 *
 * @param  {integer}  scrapLimit Article's scrap limit
 * @param  {Function} callback   Callback function
 * @return {void}
 */
function startScrapper(scrapLimit, callback) {
    /**
     * The scrap process logic.
     *
     * @return {void}
     */
    function doScrap() {
        console.log('Article Count  : ' + articleCount);
        console.log('URL in process : ' + kompas.getBaseURL());

        kompas.scrap().then(function (scraps) {
            scraps.forEach(function (news) {
                if (!news.content || scrapLimit == articleCount) {
                    return;
                }

                var article = {};

                // newContent += '<ARTICLE>\n';
                // newContent += '\t<INDEX>' + news.source + '-' + (++index) + '</INDEX>\n';
                // newContent += '\t<TITLE>' + news.title + '</TITLE>\n';
                // newContent += '\t<DATE>' + news.date + '</DATE>\n';
                // newContent += '\t<CONTENT>' + news.content + '</CONTENT>\n';
                // newContent += '</ARTICLE>\n';

                // fs.appendFile(docFile, newContent);

                article.index    = news.source + '-' + (++index);
                article.category = news.category;
                article.title    = news.title;
                article.date     = news.date;
                article.content  = news.content;

                data.articles.push(article);
                ++data.count;
                ++articleCount;
            });

            console.log(scraps.length + ' articles appended to file.');

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
            if (scrapLimit == 0 || scrapLimit > articleCount) {
                console.log();
                doScrap();
            } else if (scrapLimit <= articleCount) {
                callback(data);
            }
        });
    }

    var data         = {count: 0, articles: []};
    var articleCount = 0;

    doScrap();
}

