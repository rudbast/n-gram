$(document).ready(function () {
    // Initialize button side nav on mobile / smaller device.
    $(".button-collapse").sideNav();

    // Submit form using ajax.
    $('#btn-submit').click(function (e) {
        e.preventDefault();

        if ($('#sentence').val() == '') {
            Materialize.toast('Sentence is empty, rejected', 4000, 'rounded');
            return;
        }

        // Show progress bar after submitting form & disable button.
        $('#btn-submit').attr('disabled', true);
        $('#btn-submit').addClass('disabled');
        $('#corrector-progress').removeClass('hide');

        $.ajax({
            type: $('#form-corrector').attr('method'),
            url: $('#form-corrector').attr('action'),
            data: $('#form-corrector').serialize(),
            success: function (response) {
                $('#correction-result').removeClass('hide');
                var resultListContainer = $('#result-list');

                // Clean result before adding new ones.
                resultListContainer.empty();

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
                            `<div class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Probability: ${probability}">
                                <span class="correction-item">${sentence}</span>
                            </div>`;
                    resultListContainer.append(`<li class="collection-item">${childNode}</li>`);
                });

                // Initialize tooltip.
                $('.tooltipped').tooltip({delay: 50});
                $('.correction-item').click(function () {
                    $('#sentence').val($(this).text());
                });
            },
            complete: function () {
                // Hide progress bar & enable button submit on request completion.
                $('#btn-submit').removeAttr('disabled');
                $('#btn-submit').removeClass('disabled');
                $('#corrector-progress').addClass('hide');
            }
        });

        // Show toast on submit.
        Materialize.toast('Sentence checked', 2000, 'rounded');
    });

    // Listen for input change, hide correction result if current input
    // is empty.
    $('#sentence').on('input', function () {
        var content = $(this).val();

        if (content.length == 0) {
            $('#correction-result').addClass('hide');
        }
    });
});
