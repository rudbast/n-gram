function formSubmitSuccess(response) {
    var corrections = $.map(response.corrections, function (probability, sentence) {
        return [{
            sentence: sentence,
            probability: probability
        }];
    });

    // Sort customly.
    corrections.sort(function (a, b) {
        // Sort probability descendingly.
        if (a.probability > b.probability) {
            return -1;
        } else if (a.probability < b.probability) {
            return 1;
        } else {
            // Sort sentence ascendingly.
            if (a.sentence < b.sentence) {
                return -1;
            } else if (a.sentence > b.sentence) {
                return 1;
            } else {
                return 0;
            }
        }
    });

    corrections.forEach(function (correction) {
        var sentence    = correction.sentence,
            probability = correction.probability,
            childNode   =
                '<div class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Probability: ' + probability + '">\
                    <span class="correction-item">' + sentence + '</span>\
                </div>';
        $('#result-list').append('<li class="collection-item">' + childNode + '</li>');
    });

    // Initialize tooltip.
    $('.tooltipped').tooltip({delay: 50});
    $('.correction-item').click(function () {
        $('#sentence').val($(this).text());
    });
}
