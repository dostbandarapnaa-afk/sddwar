
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const $ = id => document.getElementById(id);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c9f5);
scene.fog = new THREE.Fog(0x87c9f5, 90, 360);

const camera = new THREE.PerspectiveCamera(
  65, innerWidth / innerHeight, 0.1, 650
);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('game').prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdff3ff, 0x536343, 2));

const sun = new THREE.DirectionalLight(0xfff1d5, 3);
sun.position.set(-20, 35, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

const mat = (color, roughness = 0.7, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const materials = {
  road: mat(0x30353b),
  line: mat(0xf4f5ee),
  grass: mat(0x477746),
  barrier: mat(0xbac2c9),
  red: mat(0xff293f, 0.3, 0.45),
  black: mat(0x11151b, 0.35),
  glass: mat(0x80cce8, 0.25, 0.2),
  tire: mat(0x17191c),
  rim: mat(0xb7c4d2, 0.25, 0.8),
  tree: mat(0x215c32),
  trunk: mat(0x68432b),
  white: mat(0xffffff),
  yellow: mat(0xffd45b),
  tail: mat(0xff1717)
};

function cube(parent, size, material, position) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size), material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radiusTop, radiusBottom, height, material, position) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 10),
    material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Procedurally created player car
function createCar(color = 0xff293f) {
  const car = new THREE.Group();
  const bodyMat = mat(color, 0.27, 0.5);

  cube(car, [1.85, 0.48, 3.7], bodyMat, [0, 0.65, 0]);
  cube(car, [1.65, 0.25, 1.0], bodyMat, [0, 0.84, -1.25]);

  const cabin = cube(
    car, [1.36, 0.68, 1.65], materials.glass, [0, 1.13, 0.12]
  );
  cabin.material = materials.glass;

  cube(car, [1.55, 0.09, 0.65], bodyMat, [0, 1.45, -0.2]);

  // Front bumper
  cube(car, [1.8, 0.2, 0.22], materials.black, [0, 0.43, -1.87]);

  // Headlights and taillights
  for (const x of [-0.63, 0.63]) {
    cube(car, [0.38, 0.12, 0.08], materials.yellow, [x, 0.78, -1.88]);
    cube(car, [0.42, 0.13, 0.08], materials.tail, [x, 0.77, 1.87]);
  }

  const wheels = [];
  for (const x of [-0.97, 0.97]) {
    for (const z of [-1.2, 1.2]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.43, z);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.39, 0.39, 0.22, 20),
        materials.tire
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheel.add(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.235, 12),
        materials.rim
      );
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);

      car.add(wheel);
      wheels.push(wheel);
    }
  }

  car.userData.wheels = wheels;
  car.userData.bodyMaterial = bodyMat;
  return car;
}

// Ground and road
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(700, 700),
  materials.grass
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Group();
scene.add(road);

cube(road, [13, 0.12, 500], materials.road, [0, 0, -190]);

// Road edge lines
for (const x of [-6.2, 6.2]) {
  cube(road, [0.14, 0.025, 500], materials.line, [x, 0.07, -190]);
}

// Dashed lane markings, refreshed as they pass behind
const dashes = [];
for (const x of [-2.05, 2.05]) {
  for (let i = 0; i < 30; i++) {
    const dash = cube(
      road, [0.09, 0.025, 4], materials.line,
      [x, 0.075, -i * 10]
    );
    dashes.push(dash);
  }
}

// Roadside barriers
const barriers = [];
for (const x of [-7, 7]) {
  for (let i = 0; i < 32; i++) {
    barriers.push(
      cube(
        road, [0.35, 0.55, 5], materials.barrier,
        [x, 0.34, -i * 12]
      )
    );
  }
}

// Trees along the highway
const trees = [];
function createTree(x, z) {
  const tree = new THREE.Group();
  cylinder(tree, 0.16, 0.23, 1.5, materials.trunk, [0, 0.75, 0]);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 3, 8),
    materials.tree
  );
  leaves.position.y = 2.5;
  leaves.castShadow = true;
  tree.add(leaves);

  tree.position.set(x, 0, z);
  scene.add(tree);
  return tree;
}

for (let i = 0; i < 38; i++) {
  trees.push(createTree(-10 - Math.random() * 12, -i * 14));
  trees.push(createTree(10 + Math.random() * 12, -i * 14 - 4));
}

// Distant mountain silhouettes
const mountainMaterial = mat(0x6c94a7);
for (let i = 0; i < 24; i++) {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(12 + Math.random() * 10, 25 + Math.random() * 30, 5),
    mountainMaterial
  );
  mountain.position.set(
    (i % 2 ? 1 : -1) * (45 + Math.random() * 55),
    12,
    -i * 24 - 30
  );
  scene.add(mountain);
}

// Player
const player = createCar(0xff263f);
player.position.set(0, 0.04, 3);
scene.add(player);

// Traffic cars
const traffic = [];
const trafficColors = [0xf5f5f5, 0x1685ee, 0xffb326, 0x242a35, 0x39b877];

for (let i = 0; i < 7; i++) {
  const car = createCar(trafficColors[i % trafficColors.length]);
  car.scale.setScalar(0.86);
  car.position.set([-4.1, 0, 4.1][i % 3], 0.04, -35 - i * 48);
  scene.add(car);
  traffic.push({
    mesh: car,
    speed: 12 + Math.random() * 12,
    lane: [-4.1, 0, 4.1][i % 3]
  });
}

// Input state
const keys = Object.create(null);
const held = {
  left: false,
  right: false,
  gas: false,
  brake: false,
  reverse: false,
  nitro: false,
  drift: false
};

let running = false;
let paused = false;
let cameraMode = 0;
let lightsOn = true;
let speed = 0;
let distance = 0;
let score = 0;
let nitro = 100;
let steering = 0;
let rpm = 900;
let gear = 1;
let messageTimer = 0;
let lastTime = performance.now();

// Headlight beams
const headlights = [];
for (const x of [-0.63, 0.63]) {
  const light = new THREE.SpotLight(0xd9f5ff, 0, 65, Math.PI / 7, 0.5, 1.4);
  light.position.set(x, 0.9, -1.7);
  light.target.position.set(x, 0.2, -25);
  player.add(light);
  player.add(light.target);
  headlights.push(light);
}

function setMessage(text, seconds = 1.5) {
  $('message').textContent = text;
  messageTimer = seconds;
}

function startGame() {
  running = true;
  paused = false;
  speed = 0;
  distance = 0;
  score = 0;
  nitro = 100;
  steering = 0;
  player.position.x = 0;

  traffic.forEach((t, i) => {
    t.mesh.position.set(t.lane, 0.04, -35 - i * 48);
    t.speed = 12 + Math.random() * 12;
  });

  $('menu').classList.add('hidden');
  $('pauseMenu').classList.add('hidden');
  $('controls').style.display = 'flex';
  $('utility').style.display = 'flex';
  setMessage('GO!', 1.3);
  lastTime = performance.now();
}

function pauseGame() {
  if (!running) return;
  paused = !paused;
  $('pauseMenu').classList.toggle('hidden', !paused);
  lastTime = performance.now();
  Object.keys(held).forEach(k => held[k] = false);
}

$('startBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', pauseGame);
$('restartBtn').addEventListener('click', startGame);
$('pauseBtn').addEventListener('click', pauseGame);

$('cameraBtn').addEventListener('click', () => {
  cameraMode = (cameraMode + 1) % 2;
  setMessage(cameraMode ? 'COCKPIT VIEW' : 'CHASE VIEW');
});

$('lightsBtn').addEventListener('click', () => {
  lightsOn = !lightsOn;
  headlights.forEach(light => light.intensity = lightsOn ? 5 : 0);
  $('lightsBtn').classList.toggle('active', lightsOn);
});

let audioContext;
function beep(frequency = 400, duration = 0.15) {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.frequency.value = frequency;
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.stop(audioContext.currentTime + duration);
  } catch {}
}

$('hornBtn').addEventListener('click', () => beep(180, 0.3));
$('handbrakeBtn').addEventListener('pointerdown', () => held.drift = true);
$('handbrakeBtn').addEventListener('pointerup', () => held.drift = false);
$('handbrakeBtn').addEventListener('pointerleave', () => held.drift = false);

// Mobile buttons support holding and release
function bindHold(id, property) {
  const button = $(id);
  const down = e => {
    e.preventDefault();
    held[property] = true;
    button.classList.add('active');
    try { button.setPointerCapture(e.pointerId); } catch {}
  };
  const up = () => {
    held[property] = false;
    button.classList.remove('active');
  };

  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('lostpointercapture', up);
  button.addEventListener('contextmenu', e => e.preventDefault());
}

bindHold('leftBtn', 'left');
bindHold('rightBtn', 'right');
bindHold('gasBtn', 'gas');
bindHold('brakeBtn', 'brake');
bindHold('reverseBtn', 'reverse');
bindHold('nitroBtn', 'nitro');

// Keyboard controls
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
    e.preventDefault();
  }

  keys[k] = true;

  if (k === 'escape' || k === 'p') {
    if (!e.repeat) pauseGame();
  }
  if (k === 'c' && !e.repeat) {
    cameraMode = (cameraMode + 1) % 2;
  }
  if (k === 'h' && !e.repeat) beep(180, 0.3);
  if (k === 'l' && !e.repeat) {
    lightsOn = !lightsOn;
    headlights.forEach(light => light.intensity = lightsOn ? 5 : 0);
  }
  if (k === 'r' && !e.repeat && running) {
    player.position.x = 0;
    speed = 0;
    setMessage('RESET');
  }
  if (k === 'shift') held.nitro = true;
  if (k === ' ') held.drift = true;
});

addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
  if (e.key.toLowerCase() === 'shift') held.nitro = false;
  if (e.key === ' ') held.drift = false;
});

addEventListener('blur', () => {
  Object.keys(held).forEach(k => held[k] = false);
  Object.keys(keys).forEach(k => keys[k] = false);
});

function update(dt) {
  const accelerate = held.gas || keys.w || keys.arrowup;
  const brake = held.brake || keys.arrowdown || keys.s;
  const reverse = held.reverse;
  const left = held.left || keys.a || keys.arrowleft;
  const right = held.right || keys.d || keys.arrowright;
  const nitroActive = (held.nitro || keys.shift) && nitro > 0 && accelerate;

  let maxSpeed = nitroActive ? 78 : 52;
  if (brake) speed -= 42 * dt;
  else if (accelerate) speed += (nitroActive ? 36 : 22) * dt;
  else speed -= 8 * dt;

  if (reverse && speed < 3) speed -= 18 * dt;
  speed = THREE.MathUtils.clamp(speed, -12, maxSpeed);

  if (nitroActive && speed > 0) nitro = Math.max(0, nitro - 32 * dt);
  else nitro = Math.min(100, nitro + 5 * dt);

  const steeringInput = (right ? 1 : 0) - (left ? 1 : 0);
  steering = THREE.MathUtils.damp(steering, steeringInput, 6, dt);

  const driftFactor = held.drift || keys[' '] ? 1.65 : 1;
  player.position.x += steering * (3.2 + Math.abs(speed) * 0.075) * dt * driftFactor;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -5.25, 5.25);

  player.rotation.y = THREE.MathUtils.damp(
    player.rotation.y, -steering * 0.16, 5, dt
  );
  player.rotation.z = THREE.MathUtils.damp(
    player.rotation.z, -steering * 0.07 * driftFactor, 5, dt
  );

  player.userData.wheels.forEach(w => {
    w.rotation.x -= speed * dt * 0.8;
  });

  const travel = Math.abs(speed) * dt;
  distance += travel;
  score += Math.max(0, speed) * dt * (nitroActive ? 3 : 1);

  // Recycle the road markings, barriers and trees
  for (const dash of dashes) {
    dash.position.z += travel;
    if (dash.position.z > 12) dash.position.z -= 300;
  }

  for (const barrier of barriers) {
    barrier.position.z += travel;
    if (barrier.position.z > 12) barrier.position.z -= 384;
  }

  for (const tree of trees) {
    tree.position.z += travel;
    if (tree.position.z > 20) {
      tree.position.z -= 532;
      tree.position.x = Math.sign(tree.position.x) * (10 + Math.random() * 12);
    }
  }

  // Traffic movement and collision checks
  for (const t of traffic) {
    t.mesh.position.z += (Math.abs(speed) - t.speed) * dt;

    if (t.mesh.position.z > 12) {
      t.mesh.position.z = -230 - Math.random() * 100;
      t.lane = [-4.1, 0, 4.1][Math.floor(Math.random() * 3)];
      t.mesh.position.x = t.lane;
      t.speed = 12 + Math.random() * 20;
    }

    const closeZ = Math.abs(t.mesh.position.z - player.position.z) < 2.8;
    const closeX = Math.abs(t.mesh.position.x - player.position.x) < 1.65;

    if (closeZ && closeX && speed > 4) {
      speed *= 0.35;
      score = Math.max(0, score - 150);
      t.mesh.position.z = -75 - Math.random() * 100;
      setMessage('CRASH!', 1);
    }
  }

  rpm = 900 + Math.abs(speed) * 95 + (accelerate ? 700 : 0);
  gear = speed < 0 ? 'R' : speed < 2 ? 'N' : Math.min(6, Math.floor(speed / 12) + 1);

  $('speed').textContent = Math.round(Math.abs(speed) * 3.6);
  $('gear').textContent = gear;
  $('distance').textContent = Math.floor(distance);
  $('score').textContent = Math.floor(score);
  $('nitroFill').style.width = nitro + '%';

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) $('message').textContent = '';
  }
}

function updateCamera(dt) {
  const targetPosition = cameraMode === 0
    ? new THREE.Vector3(
        player.position.x * 0.55,
        5.2,
        player.position.z + 9.5
      )
    : new THREE.Vector3(
        player.position.x,
        1.65,
        player.position.z + 0.35
      );

  camera.position.lerp(targetPosition, 1 - Math.exp(-4 * dt));

  const lookTarget = cameraMode === 0
    ? new THREE.Vector3(player.position.x, 1, player.position.z - 12)
    : new THREE.Vector3(player.position.x, 1.4, player.position.z - 30);

  camera.lookAt(lookTarget);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;

  if (running && !paused) {
    update(dt);
  }

  updateCamera(dt);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
});

$('controls').style.display = 'none';
$('utility').style.display = 'none';

requestAnimationFrame(animate);
