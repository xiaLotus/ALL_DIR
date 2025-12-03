// bubbleCanvas.js
const canvas = document.getElementById("anime-background");
const ctx = canvas.getContext("2d");
let w = canvas.width = window.innerWidth;
let h = canvas.height = 200;

const particles = [];
for (let i = 0; i < 40; i++) {
  particles.push({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 4 + 1,
    d: Math.random() * 50,
    vx: (Math.random() - 0.5) * 0.5,
    vy: Math.random() * -0.5 - 0.3
  });
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#90cdf4";
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function update() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < 0 || p.x < 0 || p.x > w) {
      p.x = Math.random() * w;
      p.y = h;
    }
  });
}

function animate() {
  draw();
  update();
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = 200;
});
