/* ============================================
   THE BALANCED BOOK — Main JS
   Mobile nav toggle, FAQ accordion, smooth scroll
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-links');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      // Switch hamburger ☰ / close ✕
      toggle.textContent = nav.classList.contains('open') ? '\u2715' : '\u2630';
    });

    // Close nav when a link is clicked
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.textContent = '\u2630';
      });
    });
  }

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      // Close other open items
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        if (other !== item) other.classList.remove('open');
      });
      item.classList.toggle('open');
    });
  });

});
