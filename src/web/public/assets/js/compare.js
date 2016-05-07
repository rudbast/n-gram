function formSubmitSuccess(response) {
    var resultTable = $('#result-wrapper table');

    var tableRowsId = {
        time: 'Waktu pemrosesan (milisekon)',
        corrections: 'Usulan ejaan'
    };

    var childNode = '';
    for (var identifier in tableRowsId) {
        childNode += '<tr>';
        childNode += '<td>' + tableRowsId[identifier] + '</td>';

        if (identifier == 'time') {
            response.comparison.forEach(function (corrector) {
                childNode += '<td>' + corrector[identifier].toFixed(3) + '</td>';
            });
        } else if (identifier == 'corrections') {
            response.comparison.forEach(function (corrector) {
                var corrections = $.map(corrector[identifier], function (probability, sentence) {
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

                var subChildNode = '<ul class="collection orange-text darken-4">';
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
