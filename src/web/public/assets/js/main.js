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

// Listen for keypress in textarea (sentence input) form,
// submit form if it's ENTER key.
$("#sentence").on('keypress', function (e) {
    // Check if the perssed key is enter, keycode 13.
    if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
        $('#btn-submit').click();
        return false;
    } else {
        return true;
    }
});
