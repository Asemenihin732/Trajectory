const G = 9.81;
const REFERENCE_MASS = 1500;

const SURFACE_COEFFICIENTS = {
  dry_asphalt: 0.8,
  wet_asphalt: 0.7,
  snow: 0.3,
  ice: 0.15,
};

const MASS_FRICTION_PARAMS = {
  dry_asphalt: { k: 0.08, curve: 'log' },
  wet_asphalt: { k: 0.09, curve: 'log' },
  snow: { k: 0.18, curve: 'log' },
  ice: { k: 0.25, curve: 'log' },
};

const VEHICLE_DEFAULTS = {
  car: { mass: 1500, color: 0x3498db },
  truck: { mass: 15000, color: 0xe67e22 },
  motorcycle: { mass: 200, color: 0xe74c3c },
};

export class PhysicsEngine {
  constructor() {
    this.g = G;
  }

  kmhToMs(kmh) {
    return kmh / 3.6;
  }

  msToKmh(ms) {
    return ms * 3.6;
  }

  getSurfaceCoefficient(surfaceType) {
    return SURFACE_COEFFICIENTS[surfaceType] || 0.8;
  }

  getVehicleDefaults(type) {
    return VEHICLE_DEFAULTS[type] || VEHICLE_DEFAULTS.car;
  }

  calculateEffectiveFrictionCoefficient(baseMu, mass, surfaceType) {
    const params = MASS_FRICTION_PARAMS[surfaceType] || { k: 0.1, curve: 'log' };
    const massRatio = mass / REFERENCE_MASS;

    let effectiveMu;

    switch (params.curve) {
      case 'log':
        effectiveMu = baseMu * (1 - params.k * Math.log(massRatio));
        break;
      case 'sqrt':
        effectiveMu = baseMu * (1 - params.k * (1 - 1 / Math.sqrt(massRatio)));
        break;
      case 'power':
        effectiveMu = baseMu * Math.pow(massRatio, -params.k);
        break;
      case 'linear':
      default:
        effectiveMu = baseMu * (1 - params.k * (massRatio - 1));
        break;
    }

    return Math.max(effectiveMu, baseMu * 0.3);
  }

  calculateCentripetalAcceleration(speedKmh, radius) {
    const v = this.kmhToMs(speedKmh);
    return (v * v) / radius;
  }

  calculateRadiusFromSpeed(speedKmh, mu, mass, surfaceType) {
    const v = this.kmhToMs(speedKmh);
    const effectiveMu = this.calculateEffectiveFrictionCoefficient(mu, mass, surfaceType);
    return (v * v) / (effectiveMu * this.g);
  }

  calculateMaxSpeedFlat(mu, radius, mass, surfaceType) {
    const effectiveMu = this.calculateEffectiveFrictionCoefficient(mu, mass, surfaceType);
    const vMaxMs = Math.sqrt(effectiveMu * this.g * radius);
    return this.msToKmh(vMaxMs);
  }

  calculateMaxSpeedWithBank(mu, radius, bankAngleDeg, mass, surfaceType) {
    const theta = (bankAngleDeg * Math.PI) / 180;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    const effectiveMu = this.calculateEffectiveFrictionCoefficient(mu, mass, surfaceType);
    const massEffect = Math.pow(mass / REFERENCE_MASS, 0.35);

    if (bankAngleDeg === 0) {
      return this.calculateMaxSpeedFlat(mu, radius, mass, surfaceType);
    }
    if (Math.abs(cosTheta - effectiveMu * sinTheta) < 0.001) {
      return Infinity;
    }

    const vSquared =
      (radius * this.g * massEffect * (sinTheta + effectiveMu * cosTheta)) /
      (cosTheta - effectiveMu * sinTheta);

    if (vSquared < 0) {
      return 0;
    }

    return this.msToKmh(Math.sqrt(vSquared));
  }

  calculateStability(speedKmh, mu, radius, bankAngleDeg, mass, surfaceType) {
    const effectiveMu = this.calculateEffectiveFrictionCoefficient(mu, mass, surfaceType);

    let maxSpeed;
    if (bankAngleDeg === 0) {
      maxSpeed = this.calculateMaxSpeedFlat(mu, radius, mass, surfaceType);
    } else {
      maxSpeed = this.calculateMaxSpeedWithBank(mu, radius, bankAngleDeg, mass, surfaceType);
    }

    const radiusFromSpeed = this.calculateRadiusFromSpeed(speedKmh, mu, mass, surfaceType);
    const safetyMargin = ((maxSpeed - speedKmh) / maxSpeed) * 100;
    const isStable = speedKmh <= maxSpeed;
    const acceleration = this.calculateCentripetalAcceleration(speedKmh, radius);

    let status;
    if (safetyMargin > 30) {
      status = 'Stable';
    } else if (safetyMargin > 0) {
      status = 'Marginal';
    } else if (safetyMargin > -20) {
      status = 'Skidding';
    } else {
      status = 'Loss of Control';
    }

    return {
      maxSpeed,
      radiusFromSpeed,
      currentSpeed: speedKmh,
      safetyMargin,
      isStable,
      centripetalAcceleration: acceleration,
      effectiveMu,
      status,
    };
  }

  calculateSkidTrajectory(speedKmh, mu, radius, bankAngleDeg, time, dt) {
    const v = this.kmhToMs(speedKmh);
    const maxSpeed = this.calculateMaxSpeedWithBank(mu, radius, bankAngleDeg);
    const vMax = this.kmhToMs(maxSpeed);

    const overrunFactor = v / vMax;

    const lateralAcceleration = (v * v) / radius;
    const lateralVelocity = lateralAcceleration * dt;

    const outwardDrift = lateralVelocity * dt * (overrunFactor - 1) * 0.5;

    return outwardDrift;
  }

  generateTrajectory(radius, segments = 100, racingLineOffset = 0) {
    const points = [];
    const startAngle = Math.PI;
    const endAngle = 0;

    const r = radius + racingLineOffset;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;

      const x = r * (1 + Math.cos(angle)); // от 0 до 2R
      const z = r * Math.sin(angle); // от 0 вверх и обратно
      const y = 0;

      points.push({ x, y, z, angle });
    }

    return points;
  }

  generateRacingLine(radius, segments = 100) {
    const points = [];
    const startAngle = Math.PI;
    const endAngle = 0;
    const insetFactor = 0.09;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const angle = startAngle + (endAngle - startAngle) * easedT;

      const dynamicInset = Math.sin(Math.PI - angle) * insetFactor * radius;

      const r = radius - dynamicInset;

      const x = r * (1 + Math.cos(angle));
      const z = r * Math.sin(angle);
      const y = 0;

      points.push({ x, y, z, angle });
    }

    return points;
  }

  generateTrajectoryFromVelocity(radius, radiusFromSpeed, segments = 100) {
    const points = [];
    const startAngle = Math.PI;
    const endAngle = 0;
    const insetFactor = 0.09;
    const roadWidth = 12;
    // const maxRadius = radius + roadWidth / 2 - 1;
    const maxRadius = radiusFromSpeed;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;

      const dynamicInset = Math.sin(Math.PI - angle) * insetFactor * radius;
      let r = radiusFromSpeed - dynamicInset;

      r = Math.min(r, maxRadius);

      const x = r * (1 + Math.cos(angle));
      const z = r * Math.sin(angle);
      const y = 0;

      points.push({ x, y, z, angle });
    }

    return points;
  }
}

export const physics = new PhysicsEngine();
