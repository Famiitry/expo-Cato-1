import * as THREE from 'three';

// One instanced draw for the whole leaf fall. Each leaf has its own descent,
// flutter and rotation; leaves emerge and disappear at the edges of the fall.
export function createLeafFall({ count = 22, radius = 2.65, height = 6.4, size = .65 } = {}) {
  const group = new THREE.Group(); group.userData.animated = true; group.userData.motionKind = 'leaves';
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 14), position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const t = position.getY(i) + .5, x = position.getX(i), width = Math.pow(Math.sin(Math.PI * t), .8);
    position.setXYZ(i, x * width * .62, t - .5, Math.sin(t * Math.PI) * .15 + x * x * .35);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0x6b823e, roughness: .68, side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(geometry, material, count);
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaves.frustumCulled = false;
  group.add(leaves);
  const dummy = new THREE.Object3D(), first = new THREE.Vector3();
  const specs = Array.from({ length: count }, (_, i) => {
    const phase = (i * .61803398875 + .23) % 1, angle = i * 2.39996323;
    leaves.setColorAt(i, new THREE.Color().setHSL(.21 + (i % 5) * .012, .32, .72 + (i % 3) * .06));
    return { phase, angle, radius: radius + (i % 4) * .23, speed: .072 + (i % 5) * .007, scale: size * (.65 + (i % 4) * .13) };
  });
  group.userData.animate = time => {
    specs.forEach((leaf, i) => {
      const descent = (time * leaf.speed + leaf.phase) % 1;
      const edge = Math.min(1, descent / .09, (1 - descent) / .12);
      const envelope = edge * edge * (3 - 2 * edge);
      dummy.position.set(
        Math.sin(leaf.angle) * leaf.radius + Math.sin(time * .65 + leaf.angle) * .33,
        .12 + height * (1 - descent),
        Math.cos(leaf.angle) * leaf.radius + Math.cos(time * .48 + leaf.angle) * .28
      );
      dummy.rotation.set(.35 + Math.sin(time * 1.8 + leaf.angle) * .5, leaf.angle + time * .52, Math.sin(time * 1.2 + leaf.angle) * .55);
      dummy.scale.setScalar(leaf.scale * envelope); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
      if (!i) first.copy(dummy.position);
    });
    leaves.instanceMatrix.needsUpdate = true;
  };
  group.userData.motionSample = () => first.toArray();
  group.userData.animate(0);
  return group;
}
