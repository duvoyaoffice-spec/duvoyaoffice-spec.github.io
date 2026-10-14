// DUVOYA on GitHub Pages: the host cannot send frame-ancestors / X-Frame-Options, so the page itself
// refuses to be shown inside another site's frame (clickjacking): it hides, then asks for the whole window.
(function () {
  if (window.top === window.self) return;
  document.documentElement.style.visibility = 'hidden';
  try {
    window.top.location.replace(window.location.href);
  } catch (e) {
    // the frame may not navigate its parent: the page simply stays hidden there
  }
})();
