import * as THREE from "three";

type StandinVariant = "male" | "female";
type PrimitiveVariant =
  | "cube"
  | "sphere"
  | "cylinder"
  | "torus"
  | "cone"
  | "pyramid";

export function createStandinCharacter(variant: StandinVariant) {
  const group = new THREE.Group();
  group.name = variant === "female" ? "女性素体" : "男性素体";

  const scale = variant === "female" ? 0.9 : 1;
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: variant === "female" ? 0xb171ff : 0xffb62f,
    roughness: 0.5,
    metalness: 0.05,
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: variant === "female" ? 0x6d3fd1 : 0x6a45d8,
    roughness: 0.58,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: variant === "female" ? 0xc88cff : 0xffcf58,
    roughness: 0.46,
  });

  const bones: Record<string, THREE.Bone> = {};
  const makeBone = (
    name: string,
    position: [number, number, number],
    parent?: THREE.Bone,
  ) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(position[0], position[1] * scale, position[2]);
    bones[name] = bone;
    if (parent) {
      parent.add(bone);
    }
    return bone;
  };

  const shoulderHalf = variant === "female" ? 0.2 : 0.25;
  const hipHalf = variant === "female" ? 0.135 : 0.16;
  const hips = makeBone("hips", [0, 0.86, 0]);
  const spine = makeBone("spine", [0, 0.2, 0], hips);
  const chest = makeBone("chest", [0, 0.3, 0], spine);
  const neck = makeBone("neck", [0, 0.16, 0], chest);
  const head = makeBone("head", [0, 0.13, 0], neck);

  const upperarmL = makeBone("upperarm_l", [-shoulderHalf, 0.02, 0], chest);
  const forearmL = makeBone("forearm_l", [-0.22, -0.22, 0], upperarmL);
  const handL = makeBone("hand_l", [-0.15, -0.2, 0], forearmL);
  const upperarmR = makeBone("upperarm_r", [shoulderHalf, 0.02, 0], chest);
  const forearmR = makeBone("forearm_r", [0.22, -0.22, 0], upperarmR);
  const handR = makeBone("hand_r", [0.15, -0.2, 0], forearmR);

  const thighL = makeBone("thigh_l", [-hipHalf, -0.08, 0], hips);
  const calfL = makeBone("calf_l", [0, -0.39, 0.02], thighL);
  const footL = makeBone("foot_l", [0, -0.37, 0.03], calfL);
  const toeL = makeBone("ball_l", [0, -0.04, 0.17], footL);
  const thighR = makeBone("thigh_r", [hipHalf, -0.08, 0], hips);
  const calfR = makeBone("calf_r", [0, -0.39, 0.02], thighR);
  const footR = makeBone("foot_r", [0, -0.37, 0.03], calfR);
  const toeR = makeBone("ball_r", [0, -0.04, 0.17], footR);

  const allBones = [
    hips,
    spine,
    chest,
    neck,
    head,
    upperarmL,
    forearmL,
    handL,
    upperarmR,
    forearmR,
    handR,
    thighL,
    calfL,
    footL,
    toeL,
    thighR,
    calfR,
    footR,
    toeR,
  ];

  const addJoint = (bone: THREE.Bone, radius = 0.035) => {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), jointMaterial);
    joint.name = `${bone.name}_joint`;
    bone.add(joint);
  };

  const addSegmentToChild = (
    parent: THREE.Bone,
    child: THREE.Bone,
    name: string,
    parentRadius: number,
    childRadius: number,
    material = mainMaterial,
  ) => {
    const direction = child.position.clone();
    const length = direction.length();
    if (length <= 0.001) {
      return undefined;
    }

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(childRadius, parentRadius, length, 20, 5),
      material,
    );
    mesh.name = name;
    mesh.position.copy(direction.clone().multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addBodyPart = (
    bone: THREE.Bone,
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material = mainMaterial,
  ) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 18), material);
    mesh.name = name;
    mesh.scale.set(size[0], size[1] * scale, size[2]);
    mesh.position.set(position[0], position[1] * scale, position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bone.add(mesh);
    return mesh;
  };

  const addFlattenedBand = (
    bone: THREE.Bone,
    name: string,
    radius: number,
    tube: number,
    positionY: number,
    xScale = 1,
    zScale = 0.68,
  ) => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 48),
      jointMaterial,
    );
    band.name = name;
    band.rotation.x = Math.PI / 2;
    band.scale.set(xScale, zScale, 1);
    band.position.y = positionY * scale;
    bone.add(band);
    return band;
  };

  const limbRadius = variant === "female" ? 0.044 : 0.056;
  const torsoWidth = variant === "female" ? 0.19 : 0.23;
  const waistWidth = variant === "female" ? 0.145 : 0.17;

  addBodyPart(chest, "upper_torso", [torsoWidth, 0.18, 0.12], [0, 0.08, 0], mainMaterial);
  addBodyPart(spine, "abdomen", [waistWidth, 0.18, 0.105], [0, 0.08, 0], mainMaterial);
  addBodyPart(
    hips,
    "pelvis",
    [variant === "female" ? 0.19 : 0.17, 0.105, 0.115],
    [0, -0.02, 0],
    mainMaterial,
  );
  addSegmentToChild(spine, chest, "spine_soft_link", waistWidth * 0.82, torsoWidth * 0.74);
  addSegmentToChild(chest, neck, "neck_base_link", torsoWidth * 0.36, limbRadius * 0.75);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 22), mainMaterial);
  headMesh.name = "head_mesh";
  headMesh.scale.set(
    variant === "female" ? 0.13 : 0.145,
    (variant === "female" ? 0.18 : 0.19) * scale,
    variant === "female" ? 0.13 : 0.145,
  );
  headMesh.position.y = 0.08 * scale;
  head.add(headMesh);

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.018 * scale, 10, 10),
    jointMaterial,
  );
  face.name = "face_direction";
  face.position.set(0, 0.07 * scale, 0.15);
  head.add(face);

  addSegmentToChild(chest, upperarmL, "left_shoulder_bridge", limbRadius * 0.8, limbRadius * 1.06, mainMaterial);
  addSegmentToChild(chest, upperarmR, "right_shoulder_bridge", limbRadius * 0.8, limbRadius * 1.06, mainMaterial);
  addSegmentToChild(upperarmL, forearmL, "left_upper_arm", limbRadius * 1.1, limbRadius * 0.86);
  addSegmentToChild(forearmL, handL, "left_forearm", limbRadius * 0.82, limbRadius * 0.62);
  addBodyPart(handL, "left_hand", [limbRadius * 1.2, 0.065, limbRadius * 0.95], [-0.025, -0.025, 0], accentMaterial);
  addSegmentToChild(upperarmR, forearmR, "right_upper_arm", limbRadius * 1.1, limbRadius * 0.86);
  addSegmentToChild(forearmR, handR, "right_forearm", limbRadius * 0.82, limbRadius * 0.62);
  addBodyPart(handR, "right_hand", [limbRadius * 1.2, 0.065, limbRadius * 0.95], [0.025, -0.025, 0], accentMaterial);

  addSegmentToChild(hips, thighL, "left_hip_bridge", limbRadius * 0.88, limbRadius * 1.16, mainMaterial);
  addSegmentToChild(hips, thighR, "right_hip_bridge", limbRadius * 0.88, limbRadius * 1.16, mainMaterial);
  addSegmentToChild(thighL, calfL, "left_thigh", limbRadius * 1.2, limbRadius * 0.9);
  addSegmentToChild(calfL, footL, "left_calf", limbRadius * 0.92, limbRadius * 0.66);
  addBodyPart(footL, "left_foot", [limbRadius * 1.42, 0.035, limbRadius * 2.35], [0, -0.03, 0.09], accentMaterial);
  addSegmentToChild(thighR, calfR, "right_thigh", limbRadius * 1.2, limbRadius * 0.9);
  addSegmentToChild(calfR, footR, "right_calf", limbRadius * 0.92, limbRadius * 0.66);
  addBodyPart(footR, "right_foot", [limbRadius * 1.42, 0.035, limbRadius * 2.35], [0, -0.03, 0.09], accentMaterial);

  allBones.forEach((bone) =>
    addJoint(
      bone,
      ["hand_l", "hand_r", "foot_l", "foot_r"].includes(bone.name)
        ? limbRadius * 0.95
        : ["upperarm_l", "upperarm_r", "thigh_l", "thigh_r"].includes(bone.name)
          ? limbRadius * 1.05
          : limbRadius * 0.78,
    ),
  );

  addFlattenedBand(chest, "chest_joint_band", torsoWidth * 0.9, 0.012, -0.02, 1, 0.66);
  addFlattenedBand(spine, "waist_joint_band", waistWidth * 0.95, 0.011, -0.06, 1, 0.7);
  addFlattenedBand(hips, "pelvis_joint_band", (variant === "female" ? 0.18 : 0.16), 0.011, 0.045, 1, 0.72);

  const skeletonGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const skeletonVertexCount = skeletonGeometry.getAttribute("position").count;
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  for (let index = 0; index < skeletonVertexCount; index += 1) {
    skinIndices.push(0, 0, 0, 0);
    skinWeights.push(1, 0, 0, 0);
  }
  skeletonGeometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(skinIndices, 4),
  );
  skeletonGeometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(skinWeights, 4),
  );
  const skeletonMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const skinnedMesh = new THREE.SkinnedMesh(skeletonGeometry, skeletonMaterial);
  skinnedMesh.name = "demo_character_skeleton";
  skinnedMesh.frustumCulled = false;
  skinnedMesh.add(hips);
  skinnedMesh.bind(new THREE.Skeleton(allBones));
  group.add(skinnedMesh);
  return group;
}

export function createPlaceholderCharacter() {
  const character = createStandinCharacter("male");
  character.name = "角色A";
  return character;
}

export function createPrimitiveObject(variant: PrimitiveVariant) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x8fb3ff,
    roughness: 0.45,
    metalness: 0.08,
  });

  if (variant === "sphere") {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 28), material);
    mesh.position.y = 0.48;
    mesh.name = "球体";
    return mesh;
  }

  if (variant === "cylinder") {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 1.1, 28),
      material,
    );
    mesh.position.y = 0.55;
    mesh.name = "圆柱";
    return mesh;
  }

  if (variant === "torus") {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.14, 20, 36),
      material,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = 0.56;
    mesh.name = "环状体";
    return mesh;
  }

  if (variant === "cone") {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.12, 28), material);
    mesh.position.y = 0.56;
    mesh.name = "圆锥";
    return mesh;
  }

  if (variant === "pyramid") {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 4), material);
    mesh.rotation.y = Math.PI / 4;
    mesh.position.y = 0.55;
    mesh.name = "棱锥";
    return mesh;
  }

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.y = 0.5;
  mesh.name = "立方体";
  return mesh;
}

export function createCameraMarker() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.24, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x4a4a56, roughness: 0.4 }),
  );
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: 0x4fa3ff, roughness: 0.25 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.2;

  group.add(body, lens);
  return group;
}
