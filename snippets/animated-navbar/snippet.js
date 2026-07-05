(function () {
  var nav = document.getElementById('nav');
  var pill = document.getElementById('nav-pill');
  var tooltip = document.getElementById('nav-tooltip');
  var items = nav.querySelectorAll('.nav-item');

  function movePill(el) {
    var nr = nav.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    pill.style.left   = (er.left - nr.left) + 'px';
    pill.style.top    = (er.top  - nr.top)  + 'px';
    pill.style.width  = er.width  + 'px';
    pill.style.height = er.height + 'px';
  }

  // init pill position
  var active = nav.querySelector('.nav-item.active');
  if (active) movePill(active);

  items.forEach(function (item) {
    item.addEventListener('click', function () {
      items.forEach(function (i) { i.classList.remove('active'); });
      item.classList.add('active');
      movePill(item);
    });

    item.addEventListener('mouseenter', function (e) {
      tooltip.textContent = item.dataset.label || '';
      tooltip.classList.add('visible');
      positionTooltip(e);
    });

    item.addEventListener('mousemove', positionTooltip);

    item.addEventListener('mouseleave', function () {
      tooltip.classList.remove('visible');
    });
  });

  function positionTooltip(e) {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 32) + 'px';
  }

  window.addEventListener('resize', function () {
    var cur = nav.querySelector('.nav-item.active');
    if (cur) movePill(cur);
  });
})();
