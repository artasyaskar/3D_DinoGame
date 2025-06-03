// If you have a menu (start screen), set it up here.
// You can also just immediately jump into GameScene; this is placeholder.

export function initMenuScene() {
  const title = document.createElement('div');
  title.textContent = 'Dino Runner 3D';
  title.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    font-size: 24px;
    color: #fff;
    font-family: sans-serif;
    text-shadow: 1px 1px 2px #000;
  `;
  document.body.appendChild(title);

  const instructions = document.createElement('div');
  instructions.innerHTML = `
    <p>Press <b>Space</b> to start & jump</p>
    <p>Press <b>P</b> to pause</p>
  `;
  instructions.style.cssText = `
    position: absolute;
    top: 60px;
    left: 20px;
    font-size: 16px;
    color: #fff;
    font-family: sans-serif;
    text-shadow: 1px 1px 2px #000;
  `;
  document.body.appendChild(instructions);
}
