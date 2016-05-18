/**
 * Indexer's object instance manager, used by the server to manipulate
 * Indexer's information.
 */

'use strict';

var _      = require('lodash'),
    prompt = require('prompt');

var helper   = require(__dirname + '/../util/helper.js'),
    migrator = require(__dirname + '/../util/migrator.js');

const DEFAULT_ARTICLE_FILE    = __dirname + '/../../out/articles/data.json',
      DEFAULT_TRIE_FILE       = __dirname + '/../../out/trie.json',
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
 * @param {Object} indexer Indexer's object instance
 */
function waitForCommandInput(indexer) {
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
     * @param {String} command Command string
     */
    function processCmd(command) {
        var cmd = command.split(' ');

        switch (cmd[0]) {
            case 'check':
                var result = `article file    : ${articleFile}\n`;
                    result += `index directory : ${indexDir}\n`;
                    result += `trie file       : ${trieFile}\n`;
                    result += `similarity file : ${similarityFile}`;

                console.log(result);
                break;

            case 'build':
                switch (cmd[1]) {
                    case 'index':
                        indexer.constructIndex(articleFile, function () {
                            notifyAndPrintConsole('Index built');
                        });
                        break;

                    case 'trie':
                        indexer.buildTrie(trieFile);
                        notifyAndPrintConsole('Trie built');
                        break;

                    case 'similar':
                        indexer.constructSimilarities(function () {
                            notifyAndPrintConsole('Word similarities built');
                        });
                        break;

                    case 'all':
                        indexer.constructIndex(articleFile, function () {
                            indexer.buildTrie();
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
                        });
                        break;

                    case 'trie':
                        indexer.loadTrie(trieFile, function () {
                            notifyAndPrintConsole('Trie loaded');
                        });
                        break;

                    case 'similar':
                        indexer.loadSimilarities(similarityFile, function () {
                            notifyAndPrintConsole('Word similarities loaded');
                        });
                        break;

                    case 'all':
                        indexer.loadIndex(indexDir, function () {
                            indexer.loadTrie(trieFile, function () {
                                indexer.loadSimilarities(similarityFile, function () {
                                    notifyAndPrintConsole('All informations loaded');
                                });
                            });
                        });
                        break;
                }
                break;

            case 'migrate':
                switch (cmd[1]) {
                    case 'index':
                        migrator.migrateIndex(indexer.getInformations().data, function () {
                            notifyAndPrintConsole('Index migrated');
                        });
                        break;

                    case 'similar':
                        migrator.migrateSimilarities(indexer.getInformations().similars, function () {
                            notifyAndPrintConsole('Word similarities migrated');
                        });
                        break;

                    case 'all':
                        migrator.migrateIndex(indexer.getInformations().data, function () {
                            migrator.migrateSimilar(indexer.getInformations().similars, function () {
                                notifyAndPrintConsole('All informations migrated');
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

                    case 'trie':
                        indexer.saveTrie(trieFile, function () {
                            notifyAndPrintConsole('Trie saved');
                        });
                        break;

                    case 'similar':
                        indexer.saveSimilarities(similarityFile, function () {
                            notifyAndPrintConsole('Word similarities saved');
                        });
                        break;

                    case 'all':
                        indexer.saveIndex(indexDir, function () {
                            indexer.saveTrie(trieFile, function () {
                                indexer.saveSimilarities(similarityFile, function () {
                                    notifyAndPrintConsole('All informations saved');
                                });
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
                    case 'trie':
                        trieFile = _.isEmpty(cmd[2]) ? DEFAULT_TRIE_DIR : cmd[2];
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
 */
function printMenu() {
    var menu = 'check                                   - check program\'s variables\n';
        menu += 'build <index/trie/similar/all>          - build index/similarity\n';
        menu += 'clear                                   - clear screen\n';
        menu += 'load <index/trie/similar/all>           - load index/similarity from file\n';
        menu += 'migrate <index/similar/all>             - migrate index/similarity to database\n';
        menu += 'save <index/trie/similar/all>           - save index/similarity to file\n';
        menu += 'set <article/trie/index/similar> <file> - set program\'s variables\n';
        menu += 'exit                                    - exit program';

    console.log(menu);
}

/**
 * Notify system of given message and print message to console too.
 *
 * @param {String} message Message
 */
function notifyAndPrintConsole(message) {
    helper.notify(NOTIFICATION_TITLE, message);
    console.log(message);
}

/**
 * Start runner.
 *
 * @param {Object} indexer Indexer's object instance
 */
function start(indexer) {
    prompt.start();
    waitForCommandInput(indexer);
}

/**
 * Load informations needed by the spelling corrector.
 *
 * @param {Object} indexer Indexer's object instance
 */
function initAndStart(indexer) {
    // Try load index information.
    indexer.loadIndex(indexDir, function () {
        indexer.loadTrie(trieFile, function () {
            indexer.loadSimilarities(similarityFile, function () {
                console.log('Finished loading all informations.');
                indexer.printDataInformation();

                console.log();
                start(indexer);
            });
        })
    });
}

module.exports = {
    initAndStart,
    start
};
