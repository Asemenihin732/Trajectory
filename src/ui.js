import { physics } from './physics.js';

export class UIController {
  constructor() {
    this.elements = {};
    this.callbacks = {};
    this.init();
  }

  init() {
    this.elements = {
      vehicleType: document.getElementById('vehicle-type'),
      mass: document.getElementById('mass'),
      massValue: document.getElementById('mass-value'),
      speed: document.getElementById('speed'),
      speedValue: document.getElementById('speed-value'),
      radius: document.getElementById('radius'),
      radiusValue: document.getElementById('radius-value'),
      bank: document.getElementById('bank'),
      bankValue: document.getElementById('bank-value'),
      surfaceType: document.getElementById('surface-type'),
      racingLine: document.getElementById('racing-line'),
      showForces: document.getElementById('show-forces'),
      startBtn: document.getElementById('start-btn'),
      resetBtn: document.getElementById('reset-btn'),
      maxSpeed: document.getElementById('max-speed'),
      acceleration: document.getElementById('acceleration'),
      status: document.getElementById('status'),
      safetyMargin: document.getElementById('safety-margin'),
      radiusFromSpeed: document.getElementById('radius-from-speed'),
    };

    this.setupEventListeners();
    this.updatePhysicsDisplay();
  }

  setupEventListeners() {
    this.elements.vehicleType.addEventListener('change', () => {
      const type = this.elements.vehicleType.value;
      const defaults = physics.getVehicleDefaults(type);
      this.elements.mass.value = defaults.mass;
      this.elements.massValue.textContent = defaults.mass;
      this.updatePhysicsDisplay();
      if (this.callbacks.onVehicleTypeChange) {
        this.callbacks.onVehicleTypeChange(type);
      }
    });

    this.elements.speed.addEventListener('input', () => {
      this.elements.speedValue.textContent = this.elements.speed.value;
      this.updatePhysicsDisplay();
    });

    this.elements.mass.addEventListener('input', () => {
      this.elements.massValue.textContent = this.elements.mass.value;
      this.updatePhysicsDisplay();
    });

    this.elements.radius.addEventListener('input', () => {
      this.elements.radiusValue.textContent = this.elements.radius.value;
      this.updatePhysicsDisplay();
      if (this.callbacks.onRadiusChange) {
        this.callbacks.onRadiusChange(parseInt(this.elements.radius.value));
      }
    });

    this.elements.bank.addEventListener('input', () => {
      this.elements.bankValue.textContent = this.elements.bank.value;
      this.updatePhysicsDisplay();
      if (this.callbacks.onBankChange) {
        this.callbacks.onBankChange(parseInt(this.elements.bank.value));
      }
    });

    this.elements.surfaceType.addEventListener('change', () => {
      this.updatePhysicsDisplay();
    });

    this.elements.racingLine.addEventListener('change', () => {
      if (this.callbacks.onRacingLineToggle) {
        this.callbacks.onRacingLineToggle(
          this.elements.racingLine.checked,
          this.elements.radiusFromSpeed.value,
        );
      }
    });

    this.elements.showForces.addEventListener('change', () => {
      if (this.callbacks.onForceToggle) {
        this.callbacks.onForceToggle(this.elements.showForces.checked);
      }
    });

    this.elements.startBtn.addEventListener('click', () => {
      if (this.callbacks.onStart) {
        this.callbacks.onStart(this.getParams());
      }
    });

    this.elements.resetBtn.addEventListener('click', () => {
      if (this.callbacks.onReset) {
        this.callbacks.onReset();
      }
    });
  }

  updatePhysicsDisplay() {
    const params = this.getParams();
    const stability = physics.calculateStability(
      params.speed,
      params.mu,
      params.radius,
      params.bankAngle,
      params.mass,
      params.surfaceType,
    );

    this.elements.maxSpeed.textContent = `${stability.maxSpeed.toFixed(1)} km/h`;
    this.elements.acceleration.textContent = `${stability.centripetalAcceleration.toFixed(2)} м/с²`;
    this.elements.status.textContent = stability.status;
    this.elements.safetyMargin.textContent = `${stability.safetyMargin.toFixed(1)}%`;
    this.elements.radiusFromSpeed.textContent = `${stability.radiusFromSpeed.toFixed(1)} m`;
    this.elements.radiusFromSpeed.value = stability.radiusFromSpeed;
    if (this.callbacks.onRacingLineToggle) {
      this.callbacks.onRacingLineToggle(true, this.elements.radiusFromSpeed.value);
    }
    if (this.callbacks.onParamsChange) {
      this.callbacks.onParamsChange(params);
    }
    this.updateStatusColor(stability.isStable, stability.safetyMargin);
  }

  updateStatusColor(isStable, safetyMargin) {
    const statusEl = this.elements.status;
    const marginEl = this.elements.safetyMargin;

    if (safetyMargin > 30) {
      statusEl.style.color = '#2ecc71';
      marginEl.style.color = '#2ecc71';
    } else if (safetyMargin > 0) {
      statusEl.style.color = '#f39c12';
      marginEl.style.color = '#f39c12';
    } else if (safetyMargin > -20) {
      statusEl.style.color = '#e74c3c';
      marginEl.style.color = '#e74c3c';
    } else {
      statusEl.style.color = '#c0392b';
      marginEl.style.color = '#c0392b';
    }
  }

  getParams() {
    const speed = parseInt(this.elements.speed.value);
    const mass = parseInt(this.elements.mass.value);
    const radius = parseInt(this.elements.radius.value);
    const bankAngle = parseInt(this.elements.bank.value);
    const surfaceType = this.elements.surfaceType.value;
    const mu = physics.getSurfaceCoefficient(surfaceType);
    const stability = physics.calculateStability(speed, mu, radius, bankAngle, mass, surfaceType);

    return {
      vehicleType: this.elements.vehicleType.value,
      mass: mass,
      speed: speed,
      radiusFromSpeed: stability.radiusFromSpeed,
      radius: radius,
      bankAngle: bankAngle,
      surfaceType: surfaceType,
      mu: stability.effectiveMu,
      showRacingLine: this.elements.racingLine.checked,
      showForces: this.elements.showForces.checked,
      isStable: stability.isStable,
      maxSpeed: stability.maxSpeed,
      safetyMargin: stability.safetyMargin,
    };
  }

  setRunningState(running) {
    this.elements.startBtn.disabled = running;
    this.elements.startBtn.textContent = running ? 'Running...' : 'Start Simulation';
    this.elements.vehicleType.disabled = running;
    this.elements.mass.disabled = running;
    this.elements.speed.disabled = running;
    this.elements.radius.disabled = running;
    this.elements.bank.disabled = running;
    this.elements.surfaceType.disabled = running;
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }
}
