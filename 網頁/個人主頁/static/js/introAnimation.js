// introAnimation.js
window.onload = function () {
  anime.timeline()
    .add({
      targets: 'h1',
      opacity: [0, 1],
      translateY: [50, 0],
      easing: 'easeOutElastic(1, .8)',
      duration: 1000
    })
    .add({
      targets: 'p',
      opacity: [0, 1],
      translateY: [50, 0],
      easing: 'easeOutExpo',
      duration: 800
    }, '-=600');
};
