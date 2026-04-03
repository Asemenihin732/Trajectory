import { physics } from './physics.js';

export class GraphWindow {
  constructor() {
    this.isOpen = false;
    this.currentParams = null;
    this.resizeHandler = null;
  }

  init() {
    this.createModal();
    this.createGraphs();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'graph-modal';
    modal.innerHTML = `
      <div class="graph-modal-content">
        <div class="graph-modal-header">
          <h2>Графики зависимостей</h2>
          <button class="close-graph-btn">&times;</button>
        </div>
        <div class="graphs-container">
          <div class="graph-wrapper">
            <h3>Радиус от массы</h3>
            <canvas id="graph-mass"></canvas>
          </div>
          <div class="graph-wrapper">
            <h3>Радиус от скорости</h3>
            <canvas id="graph-speed"></canvas>
          </div>
          <div class="graph-wrapper">
            <h3>Радиус от типа покрытия</h3>
            <canvas id="graph-surface"></canvas>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    this.modal = modal;
    this.closeBtn = modal.querySelector('.close-graph-btn');
    this.closeBtn.addEventListener('click', () => this.close());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  createGraphs() {
    this.graphs = {
      mass: this.initCanvas('graph-mass'),
      speed: this.initCanvas('graph-speed'),
      surface: this.initCanvas('graph-surface'),
    };
  }

  initCanvas(id) {
    const canvas = document.getElementById(id);
    const wrapper = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    return {
      canvas,
      ctx,
      width,
      height,
    };
  }

  updateGraphs(params) {
    this.currentParams = params;
    if (!this.isOpen) return;

    this.drawMassGraph();
    this.drawSpeedGraph();
    this.drawSurfaceGraph();
  }

  drawMassGraph() {
    const { ctx, width, height } = this.graphs.mass;
    const padding = { top: 30, right: 20, bottom: 50, left: 60 };

    const baseMu = physics.getSurfaceCoefficient(this.currentParams.surfaceType);
    const masses = [];
    const radii = [];

    for (let m = 500; m <= 10000; m += 250) {
      masses.push(m);
      const radius = physics.calculateRadiusFromSpeed(
        this.currentParams.speed,
        baseMu,
        m,
        this.currentParams.surfaceType,
      );
      radii.push(radius);
    }

    const minR = Math.min(...radii) * 0.9;
    const maxR = Math.max(...radii) * 1.1;
    const minM = 500;
    const maxM = 10000;

    ctx.clearRect(0, 0, width, height);

    this.drawAxes(ctx, width, height, padding, minM, maxM, minR, maxR, 'Масса (кг)', 'Радиус (м)');

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    masses.forEach((m, i) => {
      const x =
        padding.left + ((m - minM) / (maxM - minM)) * (width - padding.left - padding.right);
      const y =
        height -
        padding.bottom -
        ((radii[i] - minR) / (maxR - minR)) * (height - padding.top - padding.bottom);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    const currentMassIdx = masses.findIndex((m) => m >= this.currentParams.mass);
    if (currentMassIdx >= 0) {
      const x =
        padding.left +
        ((masses[currentMassIdx] - minM) / (maxM - minM)) * (width - padding.left - padding.right);
      const y =
        height -
        padding.bottom -
        ((radii[currentMassIdx] - minR) / (maxR - minR)) * (height - padding.top - padding.bottom);

      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSpeedGraph() {
    const { ctx, width, height } = this.graphs.speed;
    const padding = { top: 30, right: 20, bottom: 50, left: 60 };

    const baseMu = physics.getSurfaceCoefficient(this.currentParams.surfaceType);

    const speeds = [];
    const radii = [];
    for (let s = 20; s <= 180; s += 5) {
      speeds.push(s);
      const radius = physics.calculateRadiusFromSpeed(
        s,
        baseMu,
        this.currentParams.mass,
        this.currentParams.surfaceType,
      );
      radii.push(Math.min(radius, 500));
    }

    const minR = 0;
    const maxR = Math.max(...radii) * 1.1;
    const minS = 20;
    const maxS = 180;

    ctx.clearRect(0, 0, width, height);

    this.drawAxes(
      ctx,
      width,
      height,
      padding,
      minS,
      maxS,
      minR,
      maxR,
      'Скорость (км/ч)',
      'Радиус (м)',
    );

    const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
    gradient.addColorStop(0, '#00d4ff');
    gradient.addColorStop(1, '#ff6b6b');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();

    speeds.forEach((s, i) => {
      const x =
        padding.left + ((s - minS) / (maxS - minS)) * (width - padding.left - padding.right);
      const y =
        height -
        padding.bottom -
        ((radii[i] - minR) / (maxR - minR)) * (height - padding.top - padding.bottom);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    const currentSpeedIdx = speeds.findIndex((s) => s >= this.currentParams.speed);
    if (currentSpeedIdx >= 0) {
      const x =
        padding.left +
        ((speeds[currentSpeedIdx] - minS) / (maxS - minS)) * (width - padding.left - padding.right);
      const y =
        height -
        padding.bottom -
        ((radii[currentSpeedIdx] - minR) / (maxR - minR)) * (height - padding.top - padding.bottom);

      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '12px Segoe UI';
      ctx.fillText(`R = ${radii[currentSpeedIdx].toFixed(1)}м`, x + 10, y - 10);
    }
  }

  drawSurfaceGraph() {
    const { ctx, width, height } = this.graphs.surface;
    const padding = { top: 30, right: 20, bottom: 70, left: 60 };

    const surfaces = [
      { key: 'dry_asphalt', label: 'Сухой\nасфальт', baseMu: 0.8, color: '#2ecc71' },
      { key: 'wet_asphalt', label: 'Мокрый\nасфальт', baseMu: 0.5, color: '#3498db' },
      { key: 'snow', label: 'Снег', baseMu: 0.3, color: '#95a5a6' },
      { key: 'ice', label: 'Лёд', baseMu: 0.15, color: '#bdc3c7' },
    ];

    const radii = surfaces.map((s) => {
      return physics.calculateRadiusFromSpeed(
        this.currentParams.speed,
        s.baseMu,
        this.currentParams.mass,
        s.key,
      );
    });

    const displayMuValues = surfaces.map((s) => {
      return physics.calculateEffectiveFrictionCoefficient(
        s.baseMu,
        this.currentParams.mass,
        s.key,
      );
    });

    const maxR = Math.max(...radii) * 1.2;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    const barWidth = ((width - padding.left - padding.right) / surfaces.length) * 0.6;
    const gap = (width - padding.left - padding.right) / surfaces.length;

    surfaces.forEach((s, i) => {
      const x = padding.left + gap * i + gap / 2 - barWidth / 2;
      const barHeight = (radii[i] / maxR) * (height - padding.top - padding.bottom);

      const gradient = ctx.createLinearGradient(
        x,
        height - padding.bottom - barHeight,
        x,
        height - padding.bottom,
      );
      gradient.addColorStop(0, s.color);
      gradient.addColorStop(1, this.darkenColor(s.color, 0.5));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, height - padding.bottom - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '11px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(
        `μ = ${displayMuValues[i].toFixed(3)}`,
        x + barWidth / 2,
        height - padding.bottom - barHeight - 8,
      );

      const labelLines = s.label.split('\n');
      labelLines.forEach((line, lineIdx) => {
        ctx.fillText(line, x + barWidth / 2, height - padding.bottom + 15 + lineIdx * 12);
      });

      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 10px Segoe UI';
      ctx.fillText(
        `${radii[i].toFixed(0)}м`,
        x + barWidth / 2,
        height - padding.bottom - barHeight - 22,
      );
    });

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#b0b0b0';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText('Тип покрытия', width / 2, height - 15);

    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Радиус (м)', 0, 0);
    ctx.restore();
  }

  drawAxes(ctx, width, height, padding, minX, maxX, minY, maxY, labelX, labelY) {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#b0b0b0';
    ctx.font = '11px Segoe UI';

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const x = padding.left + (i / xTicks) * (width - padding.left - padding.right);
      const value = minX + (i / xTicks) * (maxX - minX);
      ctx.fillText(Math.round(value), x - 10, height - padding.bottom + 15);

      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(x, height - padding.bottom);
      ctx.lineTo(x, height - padding.bottom + 5);
      ctx.stroke();
    }

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = height - padding.bottom - (i / yTicks) * (height - padding.top - padding.bottom);
      const value = minY + (i / yTicks) * (maxY - minY);
      ctx.fillText(value.toFixed(0), padding.left - 35, y + 4);

      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(padding.left - 5, y);
      ctx.lineTo(padding.left, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#b0b0b0';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(labelX, width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(labelY, 0, 0);
    ctx.restore();
  }

  darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const dr = Math.round(r * factor);
    const dg = Math.round(g * factor);
    const db = Math.round(b * factor);

    return `rgb(${dr}, ${dg}, ${db})`;
  }

  open(params) {
    if (this.isOpen) return;

    this.currentParams = params;
    this.isOpen = true;
    this.modal.style.display = 'flex';

    this.resizeHandler = () => {
      if (this.isOpen) {
        this.resizeCanvases();
        this.updateGraphs(this.currentParams);
      }
    };
    window.addEventListener('resize', this.resizeHandler);

    setTimeout(() => {
      this.resizeCanvases();
      this.updateGraphs(params);
    }, 50);
  }

  close() {
    this.isOpen = false;
    this.modal.style.display = 'none';

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  resizeCanvases() {
    if (this.graphs) {
      Object.values(this.graphs).forEach((g) => this.resizeCanvas(g));
    }
  }

  resizeCanvas(graph) {
    const wrapper = graph.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const height = wrapper.clientWidth * 0.75;

    graph.canvas.width = width * dpr;
    graph.canvas.height = height * dpr;
    graph.canvas.style.width = width + 'px';
    graph.canvas.style.height = height + 'px';

    graph.ctx.setTransform(1, 0, 0, 1, 0, 0);
    graph.ctx.scale(dpr, dpr);
    graph.width = width;
    graph.height = height;
  }

  update(params) {
    this.currentParams = params;
    if (this.isOpen) {
      this.updateGraphs(params);
    }
  }
}

export const graphWindow = new GraphWindow();
