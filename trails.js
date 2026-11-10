/* 移動物體留下慢慢淡掉的殘影。幾何只建一次，關掉時清掉，不一直新增。 */
import * as THREE from 'three';

const geos = new Map();
function geo(radius) {
  const key = radius.toFixed(3);
  if (!geos.has(key)) geos.set(key, new THREE.SphereGeometry(radius, 12, 8));
  return geos.get(key);
}

export function createTrail(parent, { color = 0xffb15a, max = 26, radius = 0.055, hold = 0.95, peak = 0.42 } = {}) {
  const slots = [];
  for (let i = 0; i < max; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false
    });
    const mesh = new THREE.Mesh(geo(radius), mat);
    mesh.visible = false;
    mesh.renderOrder = 4;
    mesh.frustumCulled = false;
    parent.add(mesh);
    slots.push({ mesh, life: 0, hold, peak });
  }
  let on = true;
  let cursor = 0;
  const last = new THREE.Vector3();
  let has = false;
  const local = new THREE.Vector3();
  return {
    get enabled() { return on; },
    set enabled(v) {
      on = !!v;
      if (!on) this.clear();
    },
    alive() { return slots.some(s => s.life > 0); },
    clear() {
      has = false;
      slots.forEach(s => { s.life = 0; s.mesh.visible = false; s.mesh.material.opacity = 0; });
    },
    stamp(pos) {
      if (!on) return;
      local.copy(pos);
      if (pos.isVector3 && parent.worldToLocal && pos._world) parent.worldToLocal(local);
      if (has && last.distanceTo(local) < radius * 1.35) return;
      last.copy(local);
      has = true;
      const s = slots[cursor];
      s.mesh.position.copy(local);
      s.mesh.visible = true;
      s.life = s.hold;
      s.mesh.material.opacity = s.peak;
      s.mesh.scale.setScalar(1);
      cursor = (cursor + 1) % slots.length;
    },
    stampWorld(worldPos) {
      local.copy(worldPos);
      parent.worldToLocal(local);
      this.stamp(local);
    },
    update(dt) {
      for (const s of slots) {
        if (s.life <= 0) continue;
        s.life -= dt;
        const k = Math.max(0, s.life / s.hold);
        s.mesh.material.opacity = s.peak * k * k;
        s.mesh.scale.setScalar(0.45 + 0.55 * k);
        if (s.life <= 0) s.mesh.visible = false;
      }
    },
    dispose() {
      slots.forEach(s => { s.mesh.material.dispose(); parent.remove(s.mesh); });
      slots.length = 0;
    }
  };
}

export function mountTrailToggle(host, trails) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn on';
  b.textContent = '軌跡殘影：開';
  let on = true;
  b.addEventListener('click', () => {
    on = !on;
    trails.forEach(t => { if (t) t.enabled = on; });
    b.textContent = on ? '軌跡殘影：開' : '軌跡殘影：關';
    b.classList.toggle('on', on);
  });
  host.appendChild(b);
  return b;
}
