import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { physics } from './physics.js';

export class Scene3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.vehicle = null;
    this.vehicleType = 'car';
    this.trajectoryLine = null;
    this.racingLine = null;
    this.velocityLine = null;
    this.actualPath = null;
    this.forceVectors = null;
    this.roadMeshes = [];
    this.isRunning = false;
    this.currentIndex = 0;
    this.trajectoryPoints = [];
    this.racingLinePoints = [];
    this.velocityLinePoints = [];
    this.skidOffset = 0;
    this.lastTime = 0;
    this.animationId = null;
    this.callbacks = {};

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#105057');
    this.scene.fog = new THREE.Fog('#105057', 100, 500);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.set(60, 80, 80);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);

    this.setupLighting();
    this.createGround();
    this.createVehicle('car');
    this.setupRoad(50, 0);
    this.setupForceVectors();

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x400036, 0.9);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x400036, 0x400036, 0.4);
    this.scene.add(hemisphereLight);
  }

  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x400036,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(1000, 400, 0x636e72, 0x636e72);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
  }

  createVehicle(type) {
    if (this.vehicle) {
      this.scene.remove(this.vehicle);
    }

    this.vehicleType = type;
    const defaults = physics.getVehicleDefaults(type);

    this.vehicle = new THREE.Group();

    if (type === 'car') {
      this.createCarMesh(defaults.color);
    } else if (type === 'truck') {
      this.createTruckMesh(defaults.color);
    } else if (type === 'motorcycle') {
      this.createMotorcycleMesh(defaults.color);
    }

    this.vehicle.position.set(0, 0.5, 0);
    this.vehicle.castShadow = true;
    this.scene.add(this.vehicle);
  }

  createCarMesh(color) {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.6,
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7,
    });
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    this.vehicle.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.8), glassMaterial);
    cabin.position.set(-0.3, 1.5, 0);
    cabin.castShadow = true;
    this.vehicle.add(cabin);

    const wheelPositions = [
      { x: 1.3, z: 0.9 },
      { x: 1.3, z: -0.9 },
      { x: -1.3, z: 0.9 },
      { x: -1.3, z: -0.9 },
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos.x, 0.4, pos.z);
      wheel.castShadow = true;
      this.vehicle.add(wheel);
    });
  }

  createTruckMesh(color) {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.4,
    });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), bodyMaterial);
    cabin.position.set(2, 1.5, 0);
    cabin.castShadow = true;
    this.vehicle.add(cabin);

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.5, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 }),
    );
    cargo.position.set(-1.5, 1.5, 0);
    cargo.castShadow = true;
    this.vehicle.add(cargo);

    const wheelPositions = [
      { x: 2.5, z: 1.2 },
      { x: 2.5, z: -1.2 },
      { x: -1.5, z: 1.2 },
      { x: -1.5, z: -1.2 },
      { x: -3.5, z: 1.2 },
      { x: -3.5, z: -1.2 },
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos.x, 0.5, pos.z);
      wheel.castShadow = true;
      this.vehicle.add(wheel);
    });
  }

  createMotorcycleMesh(color) {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.6,
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.4), bodyMaterial);
    frame.position.y = 0.5;
    frame.castShadow = true;
    this.vehicle.add(frame);

    const engine = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 }),
    );
    engine.position.set(0, 0.3, 0);
    engine.castShadow = true;
    this.vehicle.add(engine);

    const wheelPositions = [
      { x: 0.9, z: 0 },
      { x: -0.9, z: 0 },
    ];

    wheelPositions.forEach((pos, i) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(i === 0 ? 0.35 : 0.4, i === 0 ? 0.35 : 0.4, 0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos.x, 0.15, pos.z);
      wheel.castShadow = true;
      this.vehicle.add(wheel);
    });

    const rider = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50 }),
    );
    rider.position.set(-0.2, 1.1, 0);
    rider.castShadow = true;
    this.vehicle.add(rider);
  }

  setupRoad(radius, bankAngle) {
    this.roadMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.roadMeshes = [];

    const roadWidth = 15;
    const segments = 64;
    const startAngle = Math.PI;
    const endAngle = 0;

    const bankRad = (bankAngle * Math.PI) / 180;
    const bankHeight = (Math.tan(bankRad) * roadWidth) / 2;

    const createRoadPart = (zOffset, heightOffset) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];
      const uvs = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = startAngle + (endAngle - startAngle) * t;

        const innerR = radius - roadWidth / 2;
        const outerR = radius + roadWidth / 2;

        const xInner = radius * (1 + Math.cos(angle)) - (roadWidth / 2) * Math.cos(angle);
        const zInner = radius * Math.sin(angle) - (roadWidth / 2) * Math.sin(angle);
        const yInner = zOffset * heightOffset + bankHeight * (t - 0.5) * 2;

        const xOuter = radius * (1 + Math.cos(angle)) + (roadWidth / 2) * Math.cos(angle);
        const zOuter = radius * Math.sin(angle) + (roadWidth / 2) * Math.sin(angle);
        const yOuter = -zOffset * heightOffset + bankHeight * (t - 0.5) * 2;

        vertices.push(xInner, yInner, zInner);
        vertices.push(xOuter, yOuter, zOuter);

        uvs.push(0, t);
        uvs.push(1, t);
      }

      for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      return geometry;
    };

    const roadGeometry = createRoadPart(1, 1);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d3d3d,
      roughness: 0.8,
      metalness: 0.2,
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.receiveShadow = true;
    this.scene.add(road);
    this.roadMeshes.push(road);

    const innerEdgeGeometry = new THREE.BufferGeometry();
    const innerEdgeVertices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const x = radius * (1 + Math.cos(angle)) - (roadWidth / 2) * Math.cos(angle);
      const z = radius * Math.sin(angle) - (roadWidth / 2) * Math.sin(angle);
      const y = bankHeight * (t - 0.5) * 2 + 0.05;
      innerEdgeVertices.push(x, y, z);
    }
    innerEdgeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(innerEdgeVertices, 3),
    );
    const innerEdge = new THREE.Line(
      innerEdgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xf1c40f }),
    );
    this.scene.add(innerEdge);
    this.roadMeshes.push(innerEdge);

    const outerEdgeGeometry = new THREE.BufferGeometry();
    const outerEdgeVertices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const x = radius * (1 + Math.cos(angle)) + (roadWidth / 2) * Math.cos(angle);
      const z = radius * Math.sin(angle) + (roadWidth / 2) * Math.sin(angle);
      const y = -bankHeight * (t - 0.5) * 2 + 0.05;
      outerEdgeVertices.push(x, y, z);
    }
    outerEdgeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(outerEdgeVertices, 3),
    );
    const outerEdge = new THREE.Line(
      outerEdgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xf1c40f }),
    );
    this.scene.add(outerEdge);
    this.roadMeshes.push(outerEdge);
  }

  setupTrajectory(radius, showRacingLine = false, radiusFromVelocity = 0) {
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
    }
    if (this.racingLine) {
      this.scene.remove(this.racingLine);
    }
    if (this.velocityLine) {
      this.scene.remove(this.velocityLine);
      this.velocityLine = null;
    }

    this.trajectoryPoints = physics.generateTrajectory(radius, 100, 0);

    const trajectoryGeometry = new THREE.BufferGeometry();
    const positions = this.trajectoryPoints.map((p) => new THREE.Vector3(p.x, 0.1, p.z));
    trajectoryGeometry.setFromPoints(positions);

    this.trajectoryLine = new THREE.Line(
      trajectoryGeometry,
      new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }),
    );
    this.scene.add(this.trajectoryLine);

    if (showRacingLine) {
      this.racingLinePoints = physics.generateRacingLine(radius, 100);

      const racingGeometry = new THREE.BufferGeometry();
      const racingPositions = this.racingLinePoints.map((p) => new THREE.Vector3(p.x, 0.15, p.z));
      racingGeometry.setFromPoints(racingPositions);

      this.racingLine = new THREE.Line(
        racingGeometry,
        new THREE.LineBasicMaterial({ color: 0x00bfff, linewidth: 2 }),
      );
      this.scene.add(this.racingLine);

      if (radiusFromVelocity > radius) {
        this.velocityLinePoints = physics.generateTrajectoryFromVelocity(
          radius,
          radiusFromVelocity,
          100,
        );

        const velocityGeometry = new THREE.BufferGeometry();
        const velocityPositions = this.velocityLinePoints.map(
          (p) => new THREE.Vector3(p.x, 0.2, p.z),
        );
        velocityGeometry.setFromPoints(velocityPositions);

        this.velocityLine = new THREE.Line(
          velocityGeometry,
          new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 }),
        );
        this.scene.add(this.velocityLine);
      }
    }
  }

  setupActualPath() {
    if (this.actualPath) {
      this.scene.remove(this.actualPath);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(300 * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    this.actualPath = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 2 }),
    );
    this.scene.add(this.actualPath);

    this.actualPathPositions = [];
  }

  setupForceVectors() {
    this.forceVectors = new THREE.Group();
    this.forceVectors.visible = false;

    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const centripetalMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const gravityMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const frictionMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    const createArrow = (material) => {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), material);
      shaft.position.y = 1.5;
      shaft.visible = false;

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), material);
      head.position.y = 3.3;
      head.visible = false;

      const group = new THREE.Group();
      group.add(shaft);
      group.add(head);
      return group;
    };

    this.centrifugalArrow = createArrow(arrowMaterial);
    this.forceVectors.add(this.centrifugalArrow);

    this.centripetalArrow = createArrow(centripetalMaterial);
    this.forceVectors.add(this.centripetalArrow);

    this.gravityArrow = createArrow(gravityMaterial);
    this.forceVectors.add(this.gravityArrow);

    this.frictionArrow = createArrow(frictionMaterial);
    this.forceVectors.add(this.frictionArrow);

    this.scene.add(this.forceVectors);
  }

  updateForceVectors(visible, speedKmh, mu, radius, bankAngle) {
    this.forceVectors.visible = visible;

    if (!visible) return;

    const v = speedKmh / 3.6;
    const centripetalAcc = (v * v) / radius;
    const scale = Math.min(centripetalAcc / 10, 1);

    this.centrifugalArrow.scale.set(scale, scale, scale);
    this.centrifugalArrow.rotation.z = -Math.PI / 2;
    this.centrifugalArrow.position.set(0, 3, 0);

    this.centripetalArrow.scale.set(scale, scale, scale);
    this.centripetalArrow.rotation.z = Math.PI / 2;
    this.centripetalArrow.position.set(0, 3, 0);
  }

  startSimulation(params, isStable) {
    this.isRunning = true;
    this.currentIndex = 0;
    this.skidOffset = 0;
    this.lastTime = performance.now();

    this.setupTrajectory(params.radius, params.showRacingLine, params.radiusFromVelocity);
    this.setupActualPath();

    if (!isStable) {
      this.trajectoryLine.material.color.setHex(0xff0000);
    } else {
      this.trajectoryLine.material.color.setHex(0x00ff00);
    }

    const initialPoint = this.trajectoryPoints[0];
    this.vehicle.position.set(initialPoint.x, 0.5, initialPoint.z);
    this.vehicle.rotation.y = Math.PI / 2;

    if (this.callbacks.onStart) {
      this.callbacks.onStart();
    }
  }

  stopSimulation() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  reset() {
    this.stopSimulation();
    this.vehicle.position.set(0, 0.5, 0);
    this.vehicle.rotation.y = 0;
    this.vehicle.material?.emissive?.setHex(0x000000);

    if (this.actualPath) {
      this.scene.remove(this.actualPath);
      this.actualPath = null;
    }

    if (this.trajectoryLine) {
      this.trajectoryLine.material.color.setHex(0x00ff00);
    }

    if (this.velocityLine) {
      this.scene.remove(this.velocityLine);
      this.velocityLine = null;
    }

    if (this.callbacks.onReset) {
      this.callbacks.onReset();
    }
  }

  updateSimulation(dt, params, isStable) {
    if (!this.isRunning || this.currentIndex >= this.trajectoryPoints.length) {
      if (this.callbacks && this.callbacks.onComplete) {
        this.callbacks.onComplete();
      }
      return;
    }

    const speedMs = params.speed / 3.6;
    const movementPerFrame = speedMs * dt;

    let totalMovement = 0;
    while (
      totalMovement < movementPerFrame &&
      this.currentIndex < this.trajectoryPoints.length - 1
    ) {
      const current = this.trajectoryPoints[this.currentIndex];
      const next = this.trajectoryPoints[this.currentIndex + 1];

      const dx = next.x - current.x;
      const dz = next.z - current.z;
      const segmentLength = Math.sqrt(dx * dx + dz * dz);

      const remaining = movementPerFrame - totalMovement;

      if (remaining >= segmentLength) {
        totalMovement += segmentLength;
        this.currentIndex++;
      } else {
        const ratio = remaining / segmentLength;
        const targetX = current.x + dx * ratio;
        const targetZ = current.z + dz * ratio;

        if (!isStable) {
          const skidFactor = 0.5 * (1 - (params.speed - params.maxSpeed) / params.speed);
          this.skidOffset += (params.radius + 10 - params.radius) * dt * skidFactor;
        }

        this.vehicle.position.x =
          targetX +
          (isStable
            ? 0
            : this.skidOffset *
              Math.cos((this.currentIndex / this.trajectoryPoints.length) * Math.PI));
        this.vehicle.position.z = targetZ;

        const bankRad = (params.bankAngle * Math.PI) / 180;
        const bankEffect = Math.sin(bankRad) * 0.3;
        this.vehicle.rotation.z = -bankEffect;

        if (this.actualPath) {
          this.actualPathPositions.push(this.vehicle.position.x, 0.1, this.vehicle.position.z);

          const positions = this.actualPath.geometry.attributes.position.array;
          for (let i = 0; i < this.actualPathPositions.length && i < positions.length; i++) {
            positions[i] = this.actualPathPositions[i];
          }
          this.actualPath.geometry.attributes.position.needsUpdate = true;
          this.actualPath.geometry.setDrawRange(0, this.actualPathPositions.length / 3);
        }

        break;
      }
    }

    if (this.currentIndex >= this.trajectoryPoints.length - 1) {
      this.vehicle.position.set(
        this.trajectoryPoints[this.trajectoryPoints.length - 1].x,
        0.5,
        this.trajectoryPoints[this.trajectoryPoints.length - 1].z,
      );
      this.isRunning = false;
      if (this.callbacks && this.callbacks.onComplete) {
        this.callbacks.onComplete();
      }
    }

    if (!isStable) {
      this.vehicle.traverse((child) => {
        if (child.isMesh && child.material) {
          const time = performance.now() * 0.01;
          const flash = Math.sin(time) > 0;
          if (child.material.emissive) {
            child.material.emissive.setHex(flash ? 0xff0000 : 0x000000);
          }
        }
      });
    }
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateVehicleColor(color) {
    this.vehicle.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        child.material.color.setHex(color);
      }
    });
  }

  getRenderedScene() {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
    };
  }
}
