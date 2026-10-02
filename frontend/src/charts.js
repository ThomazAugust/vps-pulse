import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

const MAX_POINTS = 30;

export class MetricsCharts {
  constructor() {
    this.cpuChart = null;
    this.netChart = null;
    this.labels = Array(MAX_POINTS).fill('');
    this.cpuData = Array(MAX_POINTS).fill(0);
    this.netInData = Array(MAX_POINTS).fill(0);
    this.netOutData = Array(MAX_POINTS).fill(0);
  }

  init(cpuCanvasId, netCanvasId) {
    const cpuCtx = document.getElementById(cpuCanvasId)?.getContext('2d');
    const netCtx = document.getElementById(netCanvasId)?.getContext('2d');

    if (!cpuCtx || !netCtx) return;

    // CPU Chart Setup
    const cpuGradient = cpuCtx.createLinearGradient(0, 0, 0, 200);
    cpuGradient.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
    cpuGradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

    this.cpuChart = new Chart(cpuCtx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Uso de CPU (%)',
          data: this.cpuData,
          borderColor: '#00f2fe',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true,
          backgroundColor: cpuGradient
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleFont: { family: 'Inter' },
            bodyFont: { family: 'JetBrains Mono' },
            callbacks: {
              label: (context) => ` CPU: ${context.parsed.y.toFixed(1)}%`
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: { display: false }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              stepSize: 25,
              callback: (val) => `${val}%`
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            }
          }
        }
      }
    });

    // Network Chart Setup
    const inGradient = netCtx.createLinearGradient(0, 0, 0, 200);
    inGradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    inGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    const outGradient = netCtx.createLinearGradient(0, 0, 0, 200);
    outGradient.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    outGradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

    this.netChart = new Chart(netCtx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: 'Download (In)',
            data: this.netInData,
            borderColor: '#38bdf8',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.35,
            fill: true,
            backgroundColor: inGradient
          },
          {
            label: 'Upload (Out)',
            data: this.netOutData,
            borderColor: '#a855f7',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.35,
            fill: true,
            backgroundColor: outGradient
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleFont: { family: 'Inter' },
            bodyFont: { family: 'JetBrains Mono' },
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} MB/s`
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            min: 0,
            suggestedMax: 5,
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val} MB/s`
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  update(cpuPercent, netInBytesPerSec, netOutBytesPerSec) {
    if (!this.cpuChart || !this.netChart) return;

    // Shift and push CPU
    this.cpuData.shift();
    this.cpuData.push(cpuPercent);
    this.cpuChart.update('none');

    // Shift and push Net (convert to MB/s)
    const inMB = +(netInBytesPerSec / (1024 * 1024)).toFixed(2);
    const outMB = +(netOutBytesPerSec / (1024 * 1024)).toFixed(2);

    this.netInData.shift();
    this.netInData.push(inMB);
    this.netOutData.shift();
    this.netOutData.push(outMB);

    // Dynamic scale for network
    const maxVal = Math.max(...this.netInData, ...this.netOutData, 2);
    this.netChart.options.scales.y.suggestedMax = Math.ceil(maxVal * 1.2);
    this.netChart.update('none');
  }
}
