/* Clicking a link to the page you're already on (e.g. the wordmark while on
   Home) would reload it and restart the background — make it a no-op. */
document.addEventListener("click", function (e) {
  var a = e.target && e.target.closest ? e.target.closest("a") : null;
  if (!a || !a.href) return;
  if (a.href.split("#")[0] === location.href.split("#")[0]) e.preventDefault();
});
