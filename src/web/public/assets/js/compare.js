/**
 * Actions upon returned response from submit sucess.
 *
 * @param {Object} response Response object after form submission
 */
function formSubmitSuccess(response) {
    var resultTable      = $('#result-wrapper table'),
        originalSentence = response.sentence,
        comparison       = response.comparison;

    var tableRowsId = {
        time: 'Lama Pemrosesan (milisekon)',
        corrections: 'Daftar Usulan Ejaan'
    };

    var childNode = '';
    for (var identifier in tableRowsId) {
        childNode += '<tr>';
        childNode += '<td><strong>' + tableRowsId[identifier] + '<strong></td>';

        if (identifier == 'time') {
            _.forEach(comparison, function (corrector) {
                childNode += '<td>' + corrector[identifier].toFixed(3) + '</td>';
            });
        } else if (identifier == 'corrections') {
            _.forEach(comparison, function (corrector) {
                var corrections  = corrector[identifier],
                    subChildNode = '<ul class="collection">';

                var index = 0;
                _.forEach(corrections, function (correction) {
                    var sentence    = correction.sentence,
                        probability = correction.probability,
                        identifier  = (index++ % 2 == 0) ? '' : ' list-odd';

                    subChildNode +=
                        '<li class="collection-item' + identifier + '">\
                            <div class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Probabilitas: ' + probability + '">\
                                <span class="correction-item">' + markStringDifference(originalSentence, sentence) + '</span>\
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
