document.getElementById('theme-input').addEventListener('change', function () {
  document.getElementById('toggle-thumb').textContent = this.checked ? '☀️' : '🌙';
});