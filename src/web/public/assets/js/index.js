/**
 * Actions upon returned response from submit sucess.
 *
 * @param {Object} response Response object after form submission
 */
function formSubmitSuccess(response) {
    var originalSentence = response.sentence,
        corrections      = response.corrections,
        index            = 0;

    _.forEach(corrections, function (correction) {
        var sentence    = correction.sentence,
            probability = correction.probability,
            identifier  = (index++ % 2 == 0) ? '' : ' list-odd',
            childNode   =
                '<li class="collection-item' + identifier + '">\
                    <div class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Probability: ' + probability + '">\
                        <span class="correction-item">' + markStringDifference(originalSentence, sentence) + '</span>\
                    </div>\
                </li>';

        $('#result-list').append(childNode);
    });

    // Initialize tooltip.
    $('.tooltipped').tooltip({delay: 50});
    $('.correction-item').click(function () {
        $('#sentence').val($(this).text());
    });
}
