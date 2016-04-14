'use strict';

/**
 * Clean article content.
 *
 * @param  {string} content Content to be clean
 * @return {string}         Cleaned content
 */
function clean(content) {
    content = content.toLowerCase();
    content = content.replace(/("|\*|'|\/)/g, '');
    content = content.replace(/(:|\(|\))/g, ',');
    content = content.replace(/(\-)/g, ' ');
    content = content.replace(/\s+/g, ' ');
    return content;
}

/**
 * Split text into sentences.
 * (uses external tools by executing shell command)
 *
 * @param  {string} text Text to be split
 * @return {object}      Split sentences
 */
function splitToSentence(text) {
    require('shelljs/global');
    var scriptFullPath = __dirname + '/textment.php';
    var scriptProcess  = exec('php ' + scriptFullPath + ' "' + text + '"', {silent: true});
    var sentences      = JSON.parse(scriptProcess.stdout);
    return sentences;
}

module.exports = {
    clean,
    splitToSentence,
};
