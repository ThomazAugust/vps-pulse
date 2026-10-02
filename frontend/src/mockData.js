/**
 * Gerador de Telemetria Simulada e Mock Data
 * Permite testar visualmente todas as métricas em tempo real sem depender de conexão imediata.
 */

let historyCpu = Array(20).fill(25);
let historyNetIn = Array(20).fill(1.2);
let historyNetOut = Array(20).fill(0.8);

export function getInitialMockData() {
  return {
    host: {
      hostname: "vps-production-01",
      os: "Ubuntu 24.04 LTS (Noble Numbat)",
      platform: "linux",
      kernelVersion: "6.8.0-45-generic",
      uptime: 1428500, // em segundos (~16.5 dias)
      load1: 1.45,
      load5: 1.20,
      load15: 0.95
    },
    cpu: {
      modelName: "AMD EPYC 7763 64-Core Processor",
      totalPercent: 34.2,
      coresCount: 4,
      mhz: 2445,
      perCorePercent: [28.4, 45.1, 22.0, 41.3]
    },
    memory: {
      total: 8589934592, // 8 GB
      used: 3951369216,  // ~3.68 GB
      free: 1856425984,  // ~1.72 GB
      available: 4638565376,
      usedPercent: 46.0,
      cached: 2341257216,
      buffers: 440881152,
      swapTotal: 2147483648, // 2 GB
      swapUsed: 322122547,   // ~300 MB
      swapPercent: 15.0
    },
    disks: [
      {
        device: "/dev/sda1",
        mountpoint: "/",
        fsType: "ext4",
        total: 105608777728, // ~100 GB
        used: 42243511091,  // ~40 GB
        free: 63365266637,
        usedPercent: 40.0,
        readBytesPerSec: 1845200, // ~1.8 MB/s
        writeBytesPerSec: 5420100  // ~5.4 MB/s
      },
      {
        device: "/dev/sda2",
        mountpoint: "/var/lib/docker",
        fsType: "ext4",
        total: 214748364800, // 200 GB
        used: 68719476736,  // 64 GB
        free: 146028888064,
        usedPercent: 32.0,
        readBytesPerSec: 3210400,
        writeBytesPerSec: 8940200
      }
    ],
    network: [
      {
        interface: "eth0",
        bytesSent: 48920194012,
        bytesRecv: 112948201948,
        bytesSentPerSec: 924500,  // ~900 KB/s
        bytesRecvPerSec: 2450000, // ~2.4 MB/s
        packetsSent: 34102948,
        packetsRecv: 89102948
      },
      {
        interface: "docker0",
        bytesSent: 12948201948,
        bytesRecv: 14920194012,
        bytesSentPerSec: 420100,
        bytesRecvPerSec: 510400,
        packetsSent: 12094833,
        packetsRecv: 14920193
      }
    ],
    docker: {
      total: 5,
      running: 4,
      paused: 0,
      stopped: 1,
      containers: [
        {
          id: "d9e8f7a6b5c4",
          name: "nginx-reverse-proxy",
          image: "nginx:alpine-slim",
          state: "running",
          status: "Up 4 days (healthy)",
          ports: ["0.0.0.0:80->80/tcp", "0.0.0.0:443->443/tcp"],
          cpuPercent: 3.4,
          memoryUsage: 45088768, // ~43 MB
          memoryLimit: 536870912, // 512 MB
          memoryPercent: 8.4,
          networkRx: 5420194812, // 5.4 GB
          networkTx: 12940294819, // 12.9 GB
          blockRead: 14920194,
          blockWrite: 4820194
        },
        {
          id: "c4b5a6f7e8d9",
          name: "postgres-database",
          image: "postgres:16-alpine",
          state: "running",
          status: "Up 4 days",
          ports: ["127.0.0.1:5432->5432/tcp"],
          cpuPercent: 12.8,
          memoryUsage: 786432000, // ~750 MB
          memoryLimit: 2147483648, // 2 GB
          memoryPercent: 36.6,
          networkRx: 1840294812,
          networkTx: 2490294819,
          blockRead: 849201940,
          blockWrite: 1482019400
        },
        {
          id: "b1a2c3d4e5f6",
          name: "redis-cache-service",
          image: "redis:7.2-alpine",
          state: "running",
          status: "Up 4 days",
          ports: ["127.0.0.1:6379->6379/tcp"],
          cpuPercent: 2.1,
          memoryUsage: 94371840, // ~90 MB
          memoryLimit: 1073741824, // 1 GB
          memoryPercent: 8.8,
          networkRx: 940294812,
          networkTx: 990294819,
          blockRead: 12920194,
          blockWrite: 28201940
        },
        {
          id: "a0b1c2d3e4f5",
          name: "api-backend-go",
          image: "ghcr.io/myorg/api-service:v2.4.1",
          state: "running",
          status: "Up 18 hours (healthy)",
          ports: ["0.0.0.0:3000->3000/tcp"],
          cpuPercent: 8.9,
          memoryUsage: 146800640, // ~140 MB
          memoryLimit: 1073741824, // 1 GB
          memoryPercent: 13.6,
          networkRx: 3440294812,
          networkTx: 4190294819,
          blockRead: 44920194,
          blockWrite: 68201940
        },
        {
          id: "f8e7d6c5b4a3",
          name: "worker-batch-process",
          image: "python:3.12-slim",
          state: "exited",
          status: "Exited (0) 2 hours ago",
          ports: [],
          cpuPercent: 0.0,
          memoryUsage: 0,
          memoryLimit: 1073741824,
          memoryPercent: 0.0,
          networkRx: 45029481,
          networkTx: 12029481,
          blockRead: 194920194,
          blockWrite: 48201940
        }
      ]
    },
    processes: [
      { pid: 1450, name: "postgres", user: "postgres", cpuPercent: 9.8, memPercent: 8.9, memRss: 764420000, status: "R" },
      { pid: 2190, name: "api-backend", user: "appuser", cpuPercent: 7.2, memPercent: 1.6, memRss: 142100000, status: "S" },
      { pid: 890, name: "dockerd", user: "root", cpuPercent: 3.1, memPercent: 1.2, memRss: 102400000, status: "S" },
      { pid: 1045, name: "containerd", user: "root", cpuPercent: 2.8, memPercent: 0.9, memRss: 78500000, status: "S" },
      { pid: 3410, name: "nginx", user: "www-data", cpuPercent: 2.5, memPercent: 0.5, memRss: 43200000, status: "S" },
      { pid: 1820, name: "redis-server", user: "redis", cpuPercent: 1.8, memPercent: 1.1, memRss: 91400000, status: "S" },
      { pid: 4520, name: "vps-agent", user: "root", cpuPercent: 0.4, memPercent: 0.1, memRss: 12400000, status: "S" },
      { pid: 1, name: "systemd", user: "root", cpuPercent: 0.1, memPercent: 0.2, memRss: 16800000, status: "S" }
    ]
  };
}

/**
 * Atualiza suavemente os valores para criar efeito de pulsação viva em tempo real
 */
export function tickMockData(prev) {
  const next = JSON.parse(JSON.stringify(prev));
  
  // Variação orgânica de CPU
  const cpuDelta = (Math.random() - 0.48) * 8;
  next.cpu.totalPercent = Math.min(98, Math.max(12, +(next.cpu.totalPercent + cpuDelta).toFixed(1)));
  
  // Cores individuais
  next.cpu.perCorePercent = next.cpu.perCorePercent.map(c => {
    return Math.min(99, Math.max(8, +(c + (Math.random() - 0.48) * 12).toFixed(1)));
  });

  // Memória RAM
  const memDelta = (Math.random() - 0.49) * 30000000;
  next.memory.used = Math.min(next.memory.total * 0.9, Math.max(next.memory.total * 0.2, next.memory.used + memDelta));
  next.memory.usedPercent = +((next.memory.used / next.memory.total) * 100).toFixed(1);
  next.memory.available = next.memory.total - next.memory.used;

  // Rede Flutuante
  const netInMb = Math.max(0.2, (2.2 + (Math.random() - 0.5) * 1.5));
  const netOutMb = Math.max(0.1, (1.1 + (Math.random() - 0.5) * 0.8));
  next.network[0].bytesRecvPerSec = Math.round(netInMb * 1024 * 1024);
  next.network[0].bytesSentPerSec = Math.round(netOutMb * 1024 * 1024);

  // Contêineres Docker
  next.docker.containers.forEach(c => {
    if (c.state === 'running') {
      const cDelta = (Math.random() - 0.49) * 4;
      c.cpuPercent = Math.min(85, Math.max(0.5, +(c.cpuPercent + cDelta).toFixed(1)));
      c.networkRx += Math.round(Math.random() * 800000);
      c.networkTx += Math.round(Math.random() * 1200000);
      c.blockWrite += Math.round(Math.random() * 40000);
    }
  });

  // Uptime
  next.host.uptime += 1;

  return next;
}
