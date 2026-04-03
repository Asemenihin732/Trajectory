import { Scene3D } from './scene.js';
import { UIController } from './ui.js';
import { physics } from './physics.js';
import { graphWindow } from './graphs.js';

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
    graphWindow.init();

    this.params = this.ui.getParams();
    this.scene3D.setupTrajectory(this.params.radius, this.params.showRacingLine, this.params.radiusFromSpeed);
    this.scene3D.setupRoad(this.params.radius, this.params.bankAngle);

    this.setupUICallbacks();
    this.setupSceneCallbacks();
    this.setupGraphsButton();
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

    this.ui.on('onParamsChange', (params) => {
      graphWindow.update(params);
    });
  }

  setupSceneCallbacks() {
    this.scene3D.on('onComplete', () => {
      this.isRunning = false;
      this.ui.setRunningState(false);
    });
  }

  setupGraphsButton() {
    const graphsBtn = document.getElementById('graphs-btn');
    graphsBtn.addEventListener('click', () => {
      const params = this.ui.getParams();
      graphWindow.open(params);
    });
  }

  startSimulation(params) {
    this.params = { ...params };
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;

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
    
    if (this.animationId) {
      clearInterval(this.animationId);
    }
    this.animationId = setInterval(() => this.animate(), 16);
  }

  animate() {
    if (!this.isRunning || !this.params) return;

    const currentTime = performance.now();
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Накапливаем время для плавного движения
    this.accumulator = (this.accumulator || 0) + dt;
    
    // Фиксированный шаг симуляции
    const fixedDt = 0.032;
    
    while (this.accumulator >= fixedDt) {
      this.scene3D.updateSimulation(fixedDt, this.params, this.params.isStable);
      this.accumulator -= fixedDt;
    }

    this.scene3D.updateForceVectors(
      this.params.showForces,
      this.params.speed,
      this.params.mu,
      this.params.radius,
      this.params.bankAngle,
    );
  }

  reset() {
    this.isRunning = false;
    this.accumulator = 0;
    if (this.animationId) {
      clearInterval(this.animationId);
      this.animationId = null;
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
