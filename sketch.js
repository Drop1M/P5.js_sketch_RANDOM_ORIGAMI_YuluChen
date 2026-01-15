// ------------------------------------------------------------
// RANDOM ORIGAMI — p5.js interactive system (mouse-controlled)
// States:
//  -1 : Start menu (DOM overlay)
//   0 : Flat paper (clean or with crease memory)
//   1 : Transition animation (folding / unfolding)
//   2 : Folded "origami" form (procedural fan-like sculpture)
//
// Interaction:
//   Click to fold / unfold.
//   First view: clean paper.
//   After first unfold: crease lines appear as "memory" of the previous fold.
// ------------------------------------------------------------

let state = -1;
let currentShape = null;

let animProgress = 0;     // 0..1 animation progress
let isFolding = true;     // true: paper -> shape, false: shape -> paper

let paperSize;
let creaseLines = [];     // stores crease segments as [x1,y1,x2,y2]

let hasCreases = false;   // crease memory appears only after the first unfold
let ignoreNextCanvasClick = false; // prevents Start button click from triggering canvas click

// DOM UI elements (p5.js DOM)
let startScreen;
let startBtn;

// ------------------------------------------------------------
// SOUND (p5.sound)
// ------------------------------------------------------------
let paperSfx;        // folding sound
let sfxReady = false;

function preload() {
  paperSfx = loadSound('paper1_Freesound.wav', () => {
    sfxReady = true;
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  paperSize = min(width, height) * 0.7;

  // Start with a clean paper (no creases).
  hasCreases = false;
  creaseLines = [];

  // Pre-generate the first folded form for the first interaction cycle.
  currentShape = generateProceduralShape();

  createStartUI();
}

function createStartUI() {
  // Fullscreen DOM overlay
  startScreen = createDiv('');
  startScreen.style('position', 'fixed');
  startScreen.style('top', '0');
  startScreen.style('left', '0');
  startScreen.style('width', '100%');
  startScreen.style('height', '100%');
  startScreen.style('background', 'rgba(242, 242, 242, 0.9)');
  startScreen.style('display', 'flex');
  startScreen.style('flex-direction', 'column');
  startScreen.style('justify-content', 'center');
  startScreen.style('align-items', 'center');
  startScreen.style('z-index', '1000');
  startScreen.style('font-family', '"Segoe UI", Roboto, Helvetica, Arial, sans-serif');

  // Title
  let title = createP('RANDOM ORIGAMI');
  title.parent(startScreen);
  title.style('font-size', '48px');
  title.style('font-weight', '200');
  title.style('letter-spacing', '15px');
  title.style('margin-bottom', '40px');
  title.style('color', '#333');

  // Start button
  startBtn = createButton('START EXPERIENCE');
  startBtn.parent(startScreen);
  startBtn.style('padding', '15px 40px');
  startBtn.style('background', 'none');
  startBtn.style('border', '1px solid #333');
  startBtn.style('letter-spacing', '3px');
  startBtn.style('cursor', 'pointer');
  startBtn.style('transition', 'all 0.3s');

  // Button hover styling
  startBtn.mouseOver(() => {
    startBtn.style('background', '#333');
    startBtn.style('color', '#fff');
  });
  startBtn.mouseOut(() => {
    startBtn.style('background', 'none');
    startBtn.style('color', '#333');
  });

  // Start experience
  startBtn.mousePressed(() => {
    ignoreNextCanvasClick = true; // stop event from also triggering canvas click logic
    startScreen.hide();
    state = 0; // show clean paper

    userStartAudio();
  });
}

function draw() {
  background(242);

  // Menu mode: draw subtle decoration only
  if (state === -1) {
    drawMenuDecoration();
    return;
  }

  // Minimal instruction for untrained users
  drawHint();

  translate(width / 2, height / 2);

  if (state === 0) {
    drawPaper(hasCreases);         // clean paper or creased paper
  } else if (state === 1) {
    handleAnimation();             // transition animation
  } else if (state === 2) {
    drawOrigami(currentShape, 1);  // fully folded form
  }
}

function drawMenuDecoration() {
  stroke(220);
  strokeWeight(1);
  for (let i = 0; i < width; i += 100) line(i, 0, i, height);
  for (let i = 0; i < height; i += 100) line(0, i, width, i);
}

function drawHint() {
  push();
  noStroke();
  fill(40, 120);
  textAlign(LEFT, BOTTOM);
  textSize(14);
  text('Click to fold / unfold', 24, height - 24);
  pop();
}

function mousePressed() {
  if (state === -1) return;

  // Ignore the click that started the experience (from the DOM button)
  if (ignoreNextCanvasClick) {
    ignoreNextCanvasClick = false;
    return;
  }

  // Paper -> Fold animation
  if (state === 0) {
    isFolding = true;
    animProgress = 0;
    state = 1;

    // Play paper sound at the start of folding
    playPaperSound(true);
  }
  // Shape -> Unfold animation
  else if (state === 2) {
    isFolding = false;
    animProgress = 1;
    state = 1;

    // Play paper sound at the start of unfolding
    playPaperSound(false);
  }
}

function handleAnimation() {
  const step = 0.03;

  if (isFolding) {
    animProgress += step;
    if (animProgress >= 1) {
      animProgress = 1;
      state = 2;
    }
  } else {
    animProgress -= step;
    if (animProgress <= 0) {
      animProgress = 0;

      // When unfolding finishes, generate crease memory from the previous folded form.
      generateCreasePattern(currentShape);
      hasCreases = true;

      // Prepare the next folded form for the next cycle.
      currentShape = generateProceduralShape();

      state = 0;
    }
  }

  // Draw transitional folding state
  drawOrigami(currentShape, easeInOutQuart(animProgress));
}

// ------------------------------------------------------------
// Procedural "Origami" Generation
// Idea: build a radial sculpture from triangles (parts) with alternating shading,
// then animate from paper-edge positions (ox, oy) into a folded interior.
// ------------------------------------------------------------

function generateProceduralShape() {
  let parts = [];
  let sides = floor(random(4, 12));
  let angleStep = TWO_PI / sides;

  let palette = ['#FFD1DC', '#B3E5FC', '#C8E6C9', '#FFF9C4', '#F8BBD0', '#E1BEE7', '#FFE0B2', '#AFCBFF'];
  let mainColor = random(palette);

  let style = floor(random(3));
  for (let i = 0; i < sides; i++) {
    let a1 = i * angleStep;
    let a2 = (i + 1) * angleStep;
    let midA = (a1 + a2) / 2;

    let innerR = random(40, 90);
    let outerR = random(130, 190);
    if (style === 0) { innerR = 70; outerR = 175; }

    parts.push({
      p: [
        { x: 0, y: 0, ox: 0, oy: 0 },
        { x: cos(a1) * innerR, y: sin(a1) * innerR, ox: cos(a1), oy: sin(a1) },
        { x: cos(midA) * outerR, y: sin(midA) * outerR, ox: cos(midA), oy: sin(midA) }
      ],
      shade: i % 2 === 0 ? 0.05 : 0.15
    });

    parts.push({
      p: [
        { x: 0, y: 0, ox: 0, oy: 0 },
        { x: cos(a2) * innerR, y: sin(a2) * innerR, ox: cos(a2), oy: sin(a2) },
        { x: cos(midA) * outerR, y: sin(midA) * outerR, ox: cos(midA), oy: sin(midA) }
      ],
      shade: i % 2 === 0 ? 0.1 : 0.2
    });
  }

  return { color: mainColor, parts: parts };
}

// Crease pattern is derived from the folded form's directional vectors (ox, oy).
function generateCreasePattern(targetShape) {
  creaseLines = [];
  let s = paperSize / 2;

  // base creases
  creaseLines.push([-s, -s, s, s], [-s, s, s, -s], [0, -s, 0, s], [-s, 0, s, 0]);

  // creases derived from each triangle part
  for (let partObj of targetShape.parts) {
    let p2 = partObj.p[1];
    let p3 = partObj.p[2];
    creaseLines.push([0, 0, p2.ox * s, p2.oy * s]);
    creaseLines.push([p2.ox * s, p2.oy * s, p3.ox * s, p3.oy * s]);
  }
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------

function drawPaper(drawCreasesFlag) {
  rectMode(CENTER);
  noStroke();
  fill(255);

  // soft shadow via canvas drawing context
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = 'rgba(0,0,0,0.06)';
  rect(0, 0, paperSize, paperSize);
  drawingContext.shadowBlur = 0;

  // crease memory
  if (drawCreasesFlag) {
    strokeWeight(0.5);
    stroke(215, 150);
    for (let l of creaseLines) line(l[0], l[1], l[2], l[3]);
  }

  // paper border
  stroke(200);
  noFill();
  rect(0, 0, paperSize, paperSize);
}

function drawOrigami(shape, t) {
  if (!shape) return;

  let baseColor = color(shape.color);

  for (let partObj of shape.parts) {
    let part = partObj.p;

    // shading transitions from paper (white) to colored folded surface
    let c = lerpColor(color(255), lerpColor(baseColor, color(0), partObj.shade), t);
    fill(c);

    stroke(40, 40, 40, lerp(0, 40, t));
    strokeWeight(0.6);

    beginShape();
    for (let v of part) {
      // start at paper edges (ox, oy), move into folded interior (x, y)
      let startX = v.ox * (paperSize / 2);
      let startY = v.oy * (paperSize / 2);
      let x = lerp(startX, v.x * (paperSize / 400), t);
      let y = lerp(startY, v.y * (paperSize / 400), t);
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}

// Quartic easing for a smoother, more "physical" folding motion.
function easeInOutQuart(x) {
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

// Responsive layout: canvas + paper scale with the browser window.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  paperSize = min(width, height) * 0.7;

  // keep crease memory visually consistent after resize
  if (hasCreases) {
    generateCreasePattern(currentShape);
  }
}

// ------------------------------------------------------------
// Sound helper
// - plays a short snippet from the paper sound
// - adds slight variation so it doesn't feel identical every time
// ------------------------------------------------------------
function playPaperSound(isFold) {
  if (!sfxReady || !paperSfx) return;

  // prevent overlap if user clicks quickly
  if (paperSfx.isPlaying()) paperSfx.stop();

  // subtle variation between fold vs unfold
  paperSfx.rate(isFold ? random(0.95, 1.05) : random(0.9, 1.0));
  paperSfx.setVolume(isFold ? 0.35 : 0.28);

  // play a short random segment (avoid repetitive identical sound)
  const dur = paperSfx.duration();
  const startAt = random(0, max(0, dur - 0.25));
  paperSfx.play(0, 1, 1, startAt);
}
