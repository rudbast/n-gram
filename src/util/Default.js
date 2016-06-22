'use strict';

var ngramUtil = require(__dirname + '/ngram.js');

const ROOT_DIR = __dirname + '/../..';

/**
 * @class     Default
 * @classdesc Class with the purpose of providing various default values needed by the system.
 */
class Default {
    /**
     * Constants related with spelling corrector / indexer's configuration.
     */
    static get DISTANCE_LIMIT() { return 1 }
    static get DISTANCE_MODE() { return 'damlev' }
    static get NGRAM_MODE() { return ngramUtil.TRIGRAM }
    static get SUGGESTIONS_LIMIT() { return 5 }

    /**
     * Constants related with spelling correction's informations.
     */
    static get INDEX_DIR() { return ROOT_DIR + '/out/ngrams' }
    static get TRIE_FILE() { return ROOT_DIR + '/out/trie.json' }
    static get SIMILARITY_FILE() { return ROOT_DIR + '/out/similars.json' }

    /**
     * Constants related with evaluations.
     */
    static get PERPLEXITY_FILE() { return ROOT_DIR + '/res/eval/perplexity.json' }
    static get ACCURACY_FILE() { return ROOT_DIR + '/res/eval/accuracy.json' }
    static get ACCURACY_PRIOR_FILE() { return ROOT_DIR + '/res/eval/accuracy-prior.json' }
    static get FALSE_POSITIVE_FILE() { return ROOT_DIR + '/res/eval/false-positive.json' }
    static get EVAL_REPORT_FILE() { return ROOT_DIR + '/out/eval/report.json' }
}

module.exports = Default;
