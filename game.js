// ===== בסיס =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(20, 30, 10);
scene.add(sun);

// ===== שלבים (שונים באמת) =====
const stageTypes = [
  () => [ // S
    [0,0],[15,-30],[-15,-60],[15,-90],[0,-130]
  ],
  () => [ // זיגזג חד
    [0,0],[-20,-25],[20,-50],[-20,-75],[20,-100]
  ],
  () => [ // פנייה חדה ימינה
    [0,0],[0,-40],[30,-60],[60,-60],[90,-60]
  ],
  () => [ // פנייה חדה שמאלה
    [0,0],[0,-40],[-30,-60],[-60,-60],[-90,-60]
  ]
];

let trackCurve, track, walls = [];
let finishZ = -120;

// ===== יצירת מסלול =====
function createStage() {
  walls.forEach(w => scene.remove(w));
  walls = [];
  if (track) scene.remove(track);

  const points = stageTypes[Math.floor(Math.random() * stageTypes.length)]()
    .map(p => new THREE.Vector3(p[0], 0, p[1]));

  trackCurve = new THREE.CatmullRomCurve3(points);

  track = new THREE.Mesh(
    new THREE.TubeGeometry(trackCurve, 200, 3, 12, false),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  scene.add(track);

  // קירות
  for (let i = 0; i < 80; i++) {
    const t = i / 80;
    const p = trackCurve.getPointAt(t);
    const tan = trackCurve.getTangentAt(t);
    const normal = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

    [-1, 1].forEach(side => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(1, 5, 6),
        new THREE.MeshStandardMaterial({ color: 0xaa0000 })
      );
      wall.position.copy(p).add(normal.clone().multiplyScalar(side * 5));
      scene.add(wall);
      walls.push(wall);
    });
  }

  finishZ = points[points.length - 1].z;
  resetCars();
}

// ===== רכבים =====
const carGeo = new THREE.BoxGeometry(2, 1, 4);

const player = new THREE.Mesh(
  carGeo,
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
scene.add(player);

const aiCars = [];
for (let i = 0; i < 3; i++) {
  const ai = new THREE.Mesh(
    carGeo,
    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
  );
  scene.add(ai);
  aiCars.push({ mesh: ai, progress: 0, speed: 0.002 + Math.random() * 0.001 });
}

// ===== איפוס =====
function resetCars() {
  player.position.set(0, 1, 0);
  player.rotation.set(0, 0, 0);
  aiCars.forEach(ai => ai.progress = 0);
}

// ===== שליטה =====
const keys = {};
addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// ===== תנועה =====
let speed = 0;
function movePlayer() {
  if (keys["w"]) speed += 0.02;
  if (keys["s"]) speed *= 0.95;
  speed = THREE.MathUtils.clamp(speed, 0, 0.6);

  if (keys["a"]) player.rotation.y += 0.04;
  if (keys["d"]) player.rotation.y -= 0.04;

  player.position.x -= Math.sin(player.rotation.y) * speed;
  player.position.z -= Math.cos(player.rotation.y) * speed;

  // פגיעה בקיר = עצירה
  walls.forEach(w => {
    if (player.position.distanceTo(w.position) < 2.5) {
      speed = 0;
    }
  });
}

// ===== AI =====
function moveAI() {
  aiCars.forEach(ai => {
    ai.progress += ai.speed;
    const p = trackCurve.getPointAt(ai.progress);
    const t = trackCurve.getTangentAt(ai.progress);

    ai.mesh.position.set(p.x, 1, p.z);
    ai.mesh.rotation.y = Math.atan2(-t.x, -t.z);
  });
}

// ===== בדיקת ניצחון =====
function checkFinish() {
  if (player.position.z < finishZ) {
    // שחקן הגיע
    const aiWon = aiCars.some(ai => ai.progress >= 1);
    if (!aiWon) {
      createStage(); // ניצחון → שלב הבא
    } else {
      resetCars();  // הפסד → אותו שלב
    }
  }

  aiCars.forEach(ai => {
    if (ai.progress >= 1) resetCars();
  });
}

// ===== מצלמה =====
function updateCamera() {
  const offset = new THREE.Vector3(0, 8, 14);
  const camPos = offset.applyMatrix4(player.matrixWorld);
  camera.position.lerp(camPos, 0.1);
  camera.lookAt(player.position);
}

// ===== לולאה =====
createStage();
function animate() {
  requestAnimationFrame(animate);
  movePlayer();
  moveAI();
  checkFinish();
  updateCamera();
  renderer.render(scene, camera);
}
animate();

// ===== Resize =====
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
