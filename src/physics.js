const G = 9.81;

const SURFACE_COEFFICIENTS = {
  dry_asphalt: 0.8,
  wet_asphalt: 0.5,
  snow: 0.3,
  ice: 0.15,
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

  calculateCentripetalAcceleration(speedKmh, radius) {
    const v = this.kmhToMs(speedKmh);
    return (v * v) / radius;
  }

  calculateRadiusFromSpeed(speedKmh, mu) {
    const v = this.kmhToMs(speedKmh);
    return (v * v) / (mu * this.g);
  }

  calculateMaxSpeedFlat(mu, radius) {
    const vMaxMs = Math.sqrt(mu * this.g * radius);
    console.log(`Max Speed (flat): ${this.msToKmh(vMaxMs)} km/h`);
    return this.msToKmh(vMaxMs);
  }

  calculateMaxSpeedWithBank(mu, radius, bankAngleDeg) {
    const theta = (bankAngleDeg * Math.PI) / 180;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    if (bankAngleDeg === 0) {
      return this.calculateMaxSpeedFlat(mu, radius);
    }
    if (Math.abs(cosTheta - mu * sinTheta) < 0.001) {
      return Infinity;
    }

    const vSquared = (radius * this.g * (sinTheta + mu * cosTheta)) / (cosTheta - mu * sinTheta);

    if (vSquared < 0) {
      return 0;
    }

    return this.msToKmh(Math.sqrt(vSquared));
  }

  calculateStability(speedKmh, mu, radius, bankAngleDeg) {
    let maxSpeed;
    if (bankAngleDeg === 0) {
      maxSpeed = this.calculateMaxSpeedFlat(mu, radius);
    } else {
      maxSpeed = this.calculateMaxSpeedWithBank(mu, radius, bankAngleDeg);
    }
    const radiusFromSpeed = this.calculateRadiusFromSpeed(speedKmh, mu);
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

    const r = radiusFromSpeed;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;

      const x = r * (1 + Math.cos(angle));
      const z = r * Math.sin(angle);
      const y = 0;

      points.push({ x, y, z, angle });
    }

    return points;
  }
}

export const physics = new PhysicsEngine();
