(function () {
  var input = document.getElementById('theme-input');
  var thumb = document.getElementById('toggle-thumb');

  input.addEventListener('change', function () {
    thumb.textContent = input.checked ? '☀️' : '🌙';
  });
})();
