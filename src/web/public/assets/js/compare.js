function formSubmitSuccess(comparison) {
    var resultTable = $('#result-wrapper table');

    var tableRowsId = {
        time: 'Waktu pemrosesan (milisekon)',
        corrections: 'Usulan ejaan'
    };

    var childNode = '';
    for (var identifier in tableRowsId) {
        childNode += '<tr>';
        childNode += '<td><strong>' + tableRowsId[identifier] + '<strong></td>';

        if (identifier == 'time') {
            comparison.forEach(function (corrector) {
                childNode += '<td>' + corrector[identifier].toFixed(3) + '</td>';
            });
        } else if (identifier == 'corrections') {
            comparison.forEach(function (corrector) {
                var corrections  = filterCorrections(corrector[identifier], 25),
                    subChildNode = '<ul class="collection orange-text darken-4">';

                corrections.forEach(function (correction) {
                    var sentence    = correction.sentence,
                        probability = correction.probability;

                    subChildNode +=
                        '<li class="collection-item">\
                            <div class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Probability: ' + probability + '">\
                                <span class="correction-item">' + sentence + '</span>\
                            </div>\
                        </li>';
                });
                subChildNode += '</ul>';
                childNode += '<td>' + subChildNode + '</td>';
            });
        }
        childNode += '</tr>';
    }
    resultTable.find('tbody').append(childNode);

    // Initialize tooltip.
    $('.tooltipped').tooltip({delay: 50});
    $('.correction-item').click(function () {
        $('#sentence').val($(this).text());
    });
}
