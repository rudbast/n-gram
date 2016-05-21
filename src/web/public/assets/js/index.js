function formSubmitSuccess(corrections) {
    corrections = filterCorrections(corrections, 25);

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
