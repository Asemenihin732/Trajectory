import { Scene3D } from './scene.js';
import { UIController } from './ui.js';
import { physics } from './physics.js';

class VehicleSimulator {
  constructor() {
    this.scene3D = null;
    this.ui = null;
    this.isRunning = false;
    this.lastTime = 0;
    this.params = null;
    this.animationId = null;
  }

  init() {
    const container = document.getElementById('canvas-container');
    this.scene3D = new Scene3D(container);
    this.ui = new UIController();

    this.params = this.ui.getParams();
    this.scene3D.setupTrajectory(this.params.radius, this.params.showRacingLine, this.params.radiusFromSpeed);
    this.scene3D.setupRoad(this.params.radius, this.params.bankAngle);

    this.setupUICallbacks();
    this.setupSceneCallbacks();
  }

  setupUICallbacks() {
    this.ui.on('onVehicleTypeChange', (type) => {
      this.scene3D.createVehicle(type);
      const defaults = physics.getVehicleDefaults(type);
      this.scene3D.updateVehicleColor(defaults.color);
    });

    this.ui.on('onRadiusChange', (radius) => {
      if (!this.isRunning) {
        this.scene3D.setupRoad(radius, this.params?.bankAngle || 0);
        this.params = { ...this.params, radius };
      }
    });

    this.ui.on('onBankChange', (bankAngle) => {
      if (!this.isRunning) {
        const radius = this.params?.radius || 50;
        this.scene3D.setupRoad(radius, bankAngle);
        this.params = { ...this.params, bankAngle };
      }
    });

    this.ui.on('onRacingLineToggle', (show, radiusFromSpeed) => {
      const params = this.ui.getParams();
      const radius = params?.radius || 50;
      this.scene3D.setupTrajectory(radius, show, radiusFromSpeed);
    });

    this.ui.on('onForceToggle', (show) => {
      const params = this.ui.getParams();
      if (params) {
        this.scene3D.updateForceVectors(
          show,
          params.speed,
          params.mu,
          params.radius,
          params.bankAngle,
        );
      }
    });

    this.ui.on('onStart', (params) => {
      this.startSimulation(params);
    });

    this.ui.on('onReset', () => {
      this.reset();
    });
  }

  setupSceneCallbacks() {
    this.scene3D.on('onComplete', () => {
      this.isRunning = false;
      this.ui.setRunningState(false);
    });
  }

  startSimulation(params) {
    this.params = { ...params };
    this.isRunning = true;
    this.lastTime = performance.now();

    this.scene3D.startSimulation(this.params, this.params.isStable);

    if (this.params.showForces) {
      this.scene3D.updateForceVectors(
        true,
        this.params.speed,
        this.params.mu,
        this.params.radius,
        this.params.bankAngle,
      );
    }

    this.ui.setRunningState(true);
    this.animate();
  }

  animate() {
    if (!this.isRunning || !this.params) return;

    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.scene3D.updateSimulation(dt, this.params, this.params.isStable);
    this.scene3D.updateForceVectors(
      this.params.showForces,
      this.params.speed,
      this.params.mu,
      this.params.radius,
      this.params.bankAngle,
    );

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  reset() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.params) {
      this.scene3D.setupRoad(this.params.radius, this.params.bankAngle);
      this.scene3D.setupTrajectory(this.params.radius, this.params.showRacingLine, this.params.radiusFromSpeed);
    }

    this.scene3D.reset();
    this.ui.setRunningState(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const simulator = new VehicleSimulator();
  simulator.init();
});
