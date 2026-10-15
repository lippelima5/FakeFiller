window.submissions = 0;
window.events = {};
document.addEventListener('submit', (e) => {
  e.preventDefault();
  window.submissions++;
});
document.addEventListener('input', (e) => {
  window.events[e.target.id] = (window.events[e.target.id] || 0) + 1;
});
document.getElementById('shadow-host').attachShadow({ mode: 'open' }).innerHTML =
  '<label>UUID <input name="uuid" id="shadow-uuid"></label>';
window.addDynamic = () => {
  document.getElementById('dynamic').innerHTML =
    '<label>Celular dinâmico <input name="mobile" id="dynamic-phone"></label>';
};
