$(function() {
  $("form").submit(function(event) {
    $("img", this).attr('src', window.location.href + $("input", this).val());
    event.preventDefault();
  });
});
