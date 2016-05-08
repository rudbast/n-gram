'use strict';

/**
 * Program arguments: <file>
 *
 * @param {string} file Full path of the file used as program output (articles data).
 */

var _ = require('lodash');

var helper = require(__dirname + '/../util/helper.js');

const DEFAULT_ARTICLE_FILE    = __dirname + '/../../out/articles/data.json',
      DEFAULT_INDEX_DIR       = __dirname + '/../../out/ngrams',
      DEFAULT_SIMILARITY_FILE = __dirname + '/../../out/similars.json',
      NOTIFICATION_TITLE      = 'Spelling Corrector Web Runner';

var articleFile    = DEFAULT_ARTICLE_FILE,
    indexDir       = DEFAULT_INDEX_DIR,
    similarityFile = DEFAULT_SIMILARITY_FILE,
    message        = '';

/**
 * Recursively wait for program command input.
 *
 * @param  {object} prompt  Prompt library object
 * @param  {object} indexer Indexer's object instance
 * @return {void}
 */
function waitForCommandInput(prompt, indexer) {
    /**
     * Print menu & request input.
     *
     * @return {void}
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
     * @param  {string} command Command string
     * @return {void}
     */
    function processCmd(command) {
        var cmd = command.split(' ');

        switch (cmd[0]) {
            case 'check':
                var result = `article file    : ${articleFile}\n`;
                    result += `index directory : ${indexDir}\n`;
                    result += `similarity file : ${similarityFile}`;

                console.log(result);
                break;

            case 'build':
                switch (cmd[1]) {
                    case 'index':
                        indexer.constructIndex(articleFile, function () {
                            notifyAndPrintConsole('Index built');
                            indexer.buildVocabularies();
                        });
                        break;

                    case 'similarity':
                        indexer.constructSimilarities(function () {
                            notifyAndPrintConsole('Word similarities built');
                        });
                        break;

                    case 'all':
                        indexer.constructIndex(articleFile, function () {
                            indexer.buildVocabularies();
                            indexer.constructSimilarities(function () {
                                notifyAndPrintConsole('All informations built');
                            });
                        });
                        break;
                }
                break;

            case 'clear':
                helper.clearScreen();
                break;

            case 'load':
                switch (cmd[1]) {
                    case 'index':
                        indexer.loadIndex(indexDir, function () {
                            notifyAndPrintConsole('Index loaded');
                            indexer.buildVocabularies();
                        });
                        break;

                    case 'similar':
                        indexer.loadSimilarities(similarityFile, function () {
                            notifyAndPrintConsole('Word similarities loaded');
                        });
                        break;

                    case 'all':
                        indexer.loadIndex(indexDir, function () {
                            indexer.buildVocabularies();
                            indexer.loadSimilarities(similarityFile, function () {
                                notifyAndPrintConsole('All informations loaded');
                            });
                        });
                        break;
                }
                break;

            case 'save':
                switch (cmd[1]) {
                    case 'index':
                        indexer.saveIndex(indexDir, function () {
                            notifyAndPrintConsole('Index saved');
                        });
                        break;

                    case 'similar':
                        indexer.saveSimilarities(similarityFile, function () {
                            notifyAndPrintConsole('Word similarities saved');
                        });
                        break;

                    case 'all':
                        indexer.saveIndex(indexDir, function () {
                            indexer.saveSimilarities(similarityFile, function () {
                                notifyAndPrintConsole('All informations saved');
                            });
                        });
                        break;
                }
                break;

            case 'set':
                switch (cmd[1]) {
                    case 'article':
                        articleFile = _.isEmpty(cmd[2]) ? DEFUALT_ARTICLE_FILE : cmd[2];
                        break;
                    case 'index':
                        indexDir = _.isEmpty(cmd[2]) ? DEFAULT_INDEX_DIR : cmd[2];
                        break;
                    case 'similar':
                        similarityFile = _.isEmpty(cmd[2]) ? DEFAULT_SIMILARITY_FILE : cmd[2];
                        break;
                }
                break;

            case 'h':
                printMenu();
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
 * Print command list menu.
 *
 * @return {void}
 */
function printMenu() {
    var menu = 'check                              - check program\'s variables\n';
        menu += 'build <index/similar/all>          - build index/similarity\n';
        menu += 'clear                              - clear screen\n';
        menu += 'load <index/similar/all>           - load index/similarity from file\n';
        menu += 'save <index/similar/all>           - save index/similarity to file\n';
        menu += 'set <article/index/similar> <file> - set program\'s variables\n';
        menu += 'exit                               - exit program';

    console.log(menu);
}

/**
 * Notify system of given message and print message to console too.
 *
 * @param  {string} message Message
 * @return {void}
 */
function notifyAndPrintConsole(message) {
    helper.notify(NOTIFICATION_TITLE, message);
    console.log(message);
}

/**
 * Load informations needed by the spelling corrector.
 *
 * @param {object} indexer Indexer's object instance
 * @return {void}
 */
function initInformation(indexer, callback) {
    // Try load index information.
    indexer.loadIndex(indexDir, function () {
        indexer.buildVocabularies();
        indexer.loadSimilarities(similarityFile, function () {
            console.log('Finished loading all informations.');
            indexer.printDataInformation();

            console.log();
            if (_.isFunction(callback)) callback();
        });
    });
}

module.exports = {
    waitForCommandInput,
    initInformation
};
