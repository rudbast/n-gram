/**
 * Filter corrections' result before sending it back to client.
 *
 * @param  {Object} corrections Corrections result in a form of dictionary (hash)
 * @param  {number} filterCount Number of result to be shown (others removed/sliced)
 * @return {Array}              Collection of correction
 */
function filterCorrections(corrections, filterCount) {
    return _.chain(corrections)
        .map(function (probability, sentence) {
            return {
                sentence: sentence,
                probability: probability
            };
        })
        .orderBy(['probability', 'sentence'], ['desc', 'asc'])
        .slice(0, filterCount)
        .value();
}

// Initialize button side nav on mobile / smaller device.
$(".button-collapse").sideNav();

// Submit form using ajax.
$('#btn-submit').click(function (e) {
    e.preventDefault();

    if ($('#sentence').val() == '') {
        Materialize.toast('Kalimat tidak boleh kosong', 4000, 'rounded');
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
            $('#result-wrapper').removeClass('hide');
            // Clean result before adding new ones.
            $('#result-list').empty();
            formSubmitSuccess(response);
        },
        complete: function () {
            // Hide progress bar & enable button submit on request completion.
            $('#btn-submit').removeAttr('disabled');
            $('#btn-submit').removeClass('disabled');
            $('#corrector-progress').addClass('hide');
        }
    });

    // Show toast on submit.
    Materialize.toast('Ejaan telah diperiksa', 2000, 'rounded');
});

// Listen for input change, hide correction result if current input
// is empty.
$('#sentence').on('input', function () {
    var content = $(this).val();

    if (content.length == 0) {
        $('#result-wrapper').addClass('hide');
    }
});
