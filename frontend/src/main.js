import './style.css';
import { createIcons, Activity, Server, Cpu, HardDrive, Wifi, Box, Terminal, Play, Square, RotateCw, Settings, CheckCircle2, AlertTriangle, ShieldCheck, Search, X } from 'lucide';
import { getInitialMockData, tickMockData } from './mockData.js';
import { MetricsCharts } from './charts.js';

// Application State
const state = {
  activeTab: 'overview', // 'overview' | 'docker' | 'processes'
  isDemoMode: true,
  isConnected: false,
  wsUrl: localStorage.getItem('vps_agent_url') || 'ws://localhost:8080/ws',
  wsToken: localStorage.getItem('vps_agent_token') || '',
  collectMode: localStorage.getItem('vps_agent_mode') || 'local',
  sshHost: localStorage.getItem('vps_agent_ssh_host') || '',
  sshUser: localStorage.getItem('vps_agent_ssh_user') || 'root',
  sshKey: localStorage.getItem('vps_agent_ssh_key') || '',
  ws: null,
  data: getInitialMockData(),
  processFilter: '',
  containerFilter: '',
  selectedLogContainer: null,
  logs: []
};

const charts = new MetricsCharts();
let demoInterval = null;

// Helpers
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

// Main Render Function
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="dashboard-layout">
      <!-- Top Navigation Header -->
      <header class="top-header">
        <div class="brand-section">
          <div class="brand-icon">
            <i data-lucide="server"></i>
          </div>
          <div class="brand-titles">
            <h1>VPS Pulse <span style="font-size: 0.8rem; font-weight: 400; opacity: 0.7;">v1.0</span></h1>
            <div class="tagline">Agente de Telemetria & Monitoramento em Tempo Real</div>
          </div>
        </div>

        <div class="header-actions">
          <div id="conn-badge" class="status-badge ${state.isDemoMode ? 'demo-mode' : (state.isConnected ? '' : 'disconnected')}">
            <span class="pulse-dot"></span>
            <span id="conn-status-text">${state.isDemoMode ? 'Modo Demonstração (Simulação)' : (state.isConnected ? 'VPS Conectada' : 'Desconectado')}</span>
          </div>

          <button id="btn-toggle-demo" class="btn-action ${state.isDemoMode ? 'btn-primary' : ''}">
            <i data-lucide="activity"></i>
            <span>${state.isDemoMode ? 'Usar VPS Real' : 'Modo Demonstração'}</span>
          </button>

          <button id="btn-settings" class="btn-icon" title="Configurações de Conexão">
            <i data-lucide="settings"></i>
          </button>
        </div>
      </header>

      <!-- VPS Quick Info Strip -->
      <section class="vps-info-strip">
        <div class="info-pill">
          <div class="info-pill-icon"><i data-lucide="server"></i></div>
          <div class="info-pill-data">
            <span class="info-pill-label">Hostname</span>
            <span class="info-pill-value" id="val-hostname">${state.data.host.hostname}</span>
          </div>
        </div>
        <div class="info-pill">
          <div class="info-pill-icon"><i data-lucide="shield-check"></i></div>
          <div class="info-pill-data">
            <span class="info-pill-label">Sistema / Kernel</span>
            <span class="info-pill-value" id="val-os" title="${state.data.host.os}">${state.data.host.os}</span>
          </div>
        </div>
        <div class="info-pill">
          <div class="info-pill-icon"><i data-lucide="activity"></i></div>
          <div class="info-pill-data">
            <span class="info-pill-label">Uptime</span>
            <span class="info-pill-value" id="val-uptime">${formatUptime(state.data.host.uptime)}</span>
          </div>
        </div>
        <div class="info-pill">
          <div class="info-pill-icon"><i data-lucide="cpu"></i></div>
          <div class="info-pill-data">
            <span class="info-pill-label">Carga Média (1 / 5 / 15m)</span>
            <span class="info-pill-value" id="val-load">${state.data.host.load1.toFixed(2)} / ${state.data.host.load5.toFixed(2)} / ${state.data.host.load15.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <!-- Navigation Tabs -->
      <nav class="nav-tabs" aria-label="Painel seções">
        <button class="tab-btn ${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
          <i data-lucide="cpu"></i> Visão Geral & Hardware
        </button>
        <button class="tab-btn ${state.activeTab === 'docker' ? 'active' : ''}" data-tab="docker">
          <i data-lucide="box"></i> Contêineres Docker
          <span class="tab-badge" id="badge-docker-count">${state.data.docker.running}/${state.data.docker.total}</span>
        </button>
        <button class="tab-btn ${state.activeTab === 'processes' ? 'active' : ''}" data-tab="processes">
          <i data-lucide="terminal"></i> Processos & Aplicações
          <span class="tab-badge">${state.data.processes.length}</span>
        </button>
      </nav>

      <!-- TAB 1: OVERVIEW & HARDWARE -->
      <div id="tab-overview" style="display: ${state.activeTab === 'overview' ? 'flex' : 'none'}; flex-direction: column; gap: 1.5rem;">
        
        <!-- 4 Metric Cards -->
        <div class="metrics-grid">
          <!-- CPU Card -->
          <div class="metric-card" style="--card-accent: var(--accent-cyan); --card-accent-from: #00f2fe; --card-accent-to: #38bdf8;">
            <div class="metric-header">
              <span class="metric-title"><i data-lucide="cpu" class="metric-icon"></i> CPU Geral</span>
              <span class="metric-badge" id="badge-cpu-cores">${state.data.cpu.coresCount} Cores</span>
            </div>
            <div class="metric-main-val">
              <span class="val-large" id="val-cpu-total">${state.data.cpu.totalPercent.toFixed(1)}</span>
              <span class="val-unit">%</span>
            </div>
            <div class="metric-progress-wrapper">
              <div class="metric-progress-track">
                <div class="metric-progress-bar" id="bar-cpu-total" style="width: ${state.data.cpu.totalPercent}%"></div>
              </div>
            </div>
            <div class="metric-details-list">
              <div class="detail-row">
                <span>Modelo:</span>
                <span style="font-size: 0.72rem; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${state.data.cpu.modelName}</span>
              </div>
              <div class="detail-row">
                <span>Frequência:</span>
                <span>${state.data.cpu.mhz} MHz</span>
              </div>
            </div>
          </div>

          <!-- RAM Card -->
          <div class="metric-card" style="--card-accent: var(--accent-purple); --card-accent-from: #8b5cf6; --card-accent-to: #c084fc;">
            <div class="metric-header">
              <span class="metric-title"><i data-lucide="hard-drive" class="metric-icon"></i> Memória RAM</span>
              <span class="metric-badge" id="badge-ram-swap">Swap: ${state.data.memory.swapPercent.toFixed(0)}%</span>
            </div>
            <div class="metric-main-val">
              <span class="val-large" id="val-ram-percent">${state.data.memory.usedPercent.toFixed(1)}</span>
              <span class="val-unit">%</span>
            </div>
            <div class="metric-progress-wrapper">
              <div class="metric-progress-track">
                <div class="metric-progress-bar" id="bar-ram-used" style="background: linear-gradient(90deg, #8b5cf6, #c084fc); width: ${state.data.memory.usedPercent}%"></div>
              </div>
            </div>
            <div class="metric-details-list">
              <div class="detail-row">
                <span>Em Uso:</span>
                <span id="val-ram-used">${formatBytes(state.data.memory.used)} / ${formatBytes(state.data.memory.total)}</span>
              </div>
              <div class="detail-row">
                <span>Disponível / Cache:</span>
                <span id="val-ram-cache">${formatBytes(state.data.memory.available)}</span>
              </div>
            </div>
          </div>

          <!-- Disk Storage Card -->
          <div class="metric-card" style="--card-accent: var(--accent-green); --card-accent-from: #10b981; --card-accent-to: #34d399;">
            <div class="metric-header">
              <span class="metric-title"><i data-lucide="hard-drive" class="metric-icon"></i> Armazenamento (Raiz)</span>
              <span class="metric-badge">${state.data.disks[0]?.fsType || 'ext4'}</span>
            </div>
            <div class="metric-main-val">
              <span class="val-large" id="val-disk-percent">${state.data.disks[0]?.usedPercent.toFixed(1) || 0}</span>
              <span class="val-unit">%</span>
            </div>
            <div class="metric-progress-wrapper">
              <div class="metric-progress-track">
                <div class="metric-progress-bar" id="bar-disk-used" style="background: linear-gradient(90deg, #10b981, #34d399); width: ${state.data.disks[0]?.usedPercent || 0}%"></div>
              </div>
            </div>
            <div class="metric-details-list">
              <div class="detail-row">
                <span>Usado / Total:</span>
                <span>${formatBytes(state.data.disks[0]?.used)} / ${formatBytes(state.data.disks[0]?.total)}</span>
              </div>
              <div class="detail-row">
                <span>I/O Leitura & Gravação:</span>
                <span id="val-disk-io">${formatBytes(state.data.disks[0]?.readBytesPerSec)}/s | ${formatBytes(state.data.disks[0]?.writeBytesPerSec)}/s</span>
              </div>
            </div>
          </div>

          <!-- Network Card -->
          <div class="metric-card" style="--card-accent: var(--accent-blue); --card-accent-from: #38bdf8; --card-accent-to: #60a5fa;">
            <div class="metric-header">
              <span class="metric-title"><i data-lucide="wifi" class="metric-icon"></i> Rede (${state.data.network[0]?.interface || 'eth0'})</span>
              <span class="metric-badge">Live</span>
            </div>
            <div class="metric-main-val">
              <span class="val-large" id="val-net-rx">${(state.data.network[0]?.bytesRecvPerSec / (1024 * 1024)).toFixed(1)}</span>
              <span class="val-unit">MB/s ↓</span>
            </div>
            <div class="metric-progress-wrapper">
              <div class="metric-progress-track">
                <div class="metric-progress-bar" style="background: linear-gradient(90deg, #38bdf8, #60a5fa); width: 65%"></div>
              </div>
            </div>
            <div class="metric-details-list">
              <div class="detail-row">
                <span>Upload (Taxa ↑):</span>
                <span id="val-net-tx">${formatBytes(state.data.network[0]?.bytesSentPerSec)}/s</span>
              </div>
              <div class="detail-row">
                <span>Total Trafegado (In/Out):</span>
                <span>${formatBytes(state.data.network[0]?.bytesRecv)} / ${formatBytes(state.data.network[0]?.bytesSent)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Real-time Charts Strip -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-header">
              <span class="metric-title"><i data-lucide="activity"></i> Histórico de Consumo de CPU</span>
              <div class="chart-legend">
                <div class="legend-item">
                  <div class="legend-color" style="background: #00f2fe;"></div>
                  <span>CPU (%)</span>
                </div>
              </div>
            </div>
            <div class="chart-canvas-container">
              <canvas id="chart-cpu"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <span class="metric-title"><i data-lucide="wifi"></i> Tráfego de Rede em Tempo Real</span>
              <div class="chart-legend">
                <div class="legend-item">
                  <div class="legend-color" style="background: #38bdf8;"></div>
                  <span>Download (MB/s)</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #a855f7;"></div>
                  <span>Upload (MB/s)</span>
                </div>
              </div>
            </div>
            <div class="chart-canvas-container">
              <canvas id="chart-net"></canvas>
            </div>
          </div>
        </div>

        <!-- Multi-Core Usage & Partitions Row -->
        <div class="sub-sections-grid">
          <div class="section-panel">
            <div class="panel-title-bar">
              <h3><i data-lucide="cpu"></i> Utilização por Núcleo de Processamento</h3>
            </div>
            <div id="cores-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.85rem;">
              ${renderCores(state.data.cpu.perCorePercent)}
            </div>
          </div>

          <div class="section-panel">
            <div class="panel-title-bar">
              <h3><i data-lucide="hard-drive"></i> Partições de Disco & Volumes</h3>
            </div>
            <div id="disks-container">
              ${renderDisks(state.data.disks)}
            </div>
          </div>
        </div>

      </div>

      <!-- TAB 2: DEDICATED DOCKER CONTAINERS -->
      <div id="tab-docker" style="display: ${state.activeTab === 'docker' ? 'flex' : 'none'};" class="docker-section-wrapper">
        <!-- Summary Cards -->
        <div class="docker-summary-strip">
          <div class="docker-stat-box active-containers">
            <div class="docker-stat-info">
              <h4>Em Execução</h4>
              <div class="stat-num" id="docker-cnt-running">${state.data.docker.running}</div>
            </div>
            <i data-lucide="play" style="color: var(--accent-green); width: 28px; height: 28px;"></i>
          </div>

          <div class="docker-stat-box paused-containers">
            <div class="docker-stat-info">
              <h4>Pausados</h4>
              <div class="stat-num" id="docker-cnt-paused">${state.data.docker.paused}</div>
            </div>
            <i data-lucide="alert-triangle" style="color: var(--accent-amber); width: 28px; height: 28px;"></i>
          </div>

          <div class="docker-stat-box stopped-containers">
            <div class="docker-stat-info">
              <h4>Parados</h4>
              <div class="stat-num" id="docker-cnt-stopped">${state.data.docker.stopped}</div>
            </div>
            <i data-lucide="square" style="color: var(--accent-rose); width: 28px; height: 28px;"></i>
          </div>

          <div class="docker-stat-box total-containers">
            <div class="docker-stat-info">
              <h4>Total de Contêineres</h4>
              <div class="stat-num" id="docker-cnt-total">${state.data.docker.total}</div>
            </div>
            <i data-lucide="box" style="color: var(--accent-purple); width: 28px; height: 28px;"></i>
          </div>
        </div>

        <!-- Filter bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <h3 style="font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="box"></i> Aplicações e Serviços em Contêineres
          </h3>
          <div style="position: relative;">
            <input type="text" id="input-filter-docker" class="table-filter-input" placeholder="Filtrar por nome ou imagem..." value="${state.containerFilter}">
          </div>
        </div>

        <!-- Containers Grid -->
        <div class="docker-cards-grid" id="docker-cards-container">
          ${renderDockerContainers(state.data.docker.containers, state.containerFilter)}
        </div>
      </div>

      <!-- TAB 3: PROCESSES & APPLICATIONS -->
      <div id="tab-processes" style="display: ${state.activeTab === 'processes' ? 'flex' : 'none'}; flex-direction: column; gap: 1rem;">
        <div class="section-panel">
          <div class="panel-title-bar">
            <h3><i data-lucide="terminal"></i> Processos em Execução no Sistema</h3>
            <input type="text" id="input-filter-processes" class="table-filter-input" placeholder="Filtrar processos..." value="${state.processFilter}">
          </div>
          <div class="data-table-container">
            <table class="tech-table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Nome do Processo</th>
                  <th>Usuário</th>
                  <th>% CPU</th>
                  <th>% RAM</th>
                  <th>Memória RSS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="processes-tbody">
                ${renderProcessesTable(state.data.processes, state.processFilter)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>

    <!-- Container Logs Modal -->
    <div id="modal-logs" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3><i data-lucide="terminal"></i> Logs do Contêiner: <span id="modal-log-title" style="color: var(--accent-cyan); font-family: var(--font-mono);"></span></h3>
          <button class="btn-icon" id="btn-close-logs"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="terminal-box" id="terminal-content">Carregando logs...</div>
        </div>
        <div class="modal-footer">
          <button class="btn-action" id="btn-clear-logs"><i data-lucide="rotate-cw"></i> Limpar</button>
          <button class="btn-action btn-primary" id="btn-close-logs-modal">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="modal-settings" class="modal-overlay">
      <div class="modal-content" style="max-width: 520px;">
        <div class="modal-header">
          <h3><i data-lucide="settings"></i> Conectar ao Agente Go da VPS</h3>
          <button class="btn-icon" id="btn-close-settings"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Escolha como deseja monitorar seu servidor: através de um Agente já instalado ou via SSH diretamente.
          </p>

          <div class="form-group" style="margin-bottom: 1.5rem;">
             <label style="font-size: 0.9rem; font-weight: 500; margin-bottom: 0.8rem; display: block;">Modo de Conexão</label>
             <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; background: var(--surface-light); padding: 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                   <input type="radio" name="cfg-connection-mode" value="local" ${state.collectMode === 'local' ? 'checked' : ''} style="margin-top: 0.2rem;">
                   <div>
                      <div style="font-weight: 500; margin-bottom: 0.2rem;">Agente Instalado (Recomendado)</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">Conecta diretamente a um VPS Pulse Agent já rodando no servidor destino.</div>
                   </div>
                </label>
                <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; background: var(--surface-light); padding: 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                   <input type="radio" name="cfg-connection-mode" value="ssh" ${state.collectMode === 'ssh' ? 'checked' : ''} style="margin-top: 0.2rem;">
                   <div>
                      <div style="font-weight: 500; margin-bottom: 0.2rem;">Agentless (SSH Remoto)</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">Usa este servidor local para monitorar outra máquina remotamente via SSH.</div>
                   </div>
                </label>
             </div>
          </div>

          <div id="cfg-mode-local-fields" style="display: ${state.collectMode === 'local' ? 'block' : 'none'}; padding-top: 10px; border-top: 1px solid var(--border-color);">
             <div class="form-group">
               <label for="cfg-ws-url">Endereço WebSocket do Agente</label>
               <input type="text" id="cfg-ws-url" class="form-input" value="${state.wsUrl}" placeholder="ws://seu-ip-da-vps:8080/ws">
             </div>
             <div class="form-group">
               <label for="cfg-ws-token">Token Secreto (Bearer)</label>
               <input type="password" id="cfg-ws-token" class="form-input" value="${state.wsToken}" placeholder="Ex: meu-token-super-seguro">
             </div>
          </div>

          <div id="cfg-mode-ssh-fields" style="display: ${state.collectMode === 'ssh' ? 'block' : 'none'}; padding-top: 10px; border-top: 1px solid var(--border-color);">
             <div class="form-group">
                <label for="cfg-ssh-host">Endereço SSH (IP:Porta)</label>
                <input type="text" id="cfg-ssh-host" class="form-input" value="${state.sshHost}" placeholder="192.168.1.10:22">
             </div>
             <div class="form-group">
                <label for="cfg-ssh-user">Usuário SSH</label>
                <input type="text" id="cfg-ssh-user" class="form-input" value="${state.sshUser}" placeholder="root">
             </div>
             <div class="form-group">
                <label>Método de Chave Privada</label>
                <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                   <label style="display: flex; align-items: center; gap: 0.2rem; cursor: pointer;">
                      <input type="radio" name="ssh-key-mode" value="file" checked> Carregar Arquivo
                   </label>
                   <label style="display: flex; align-items: center; gap: 0.2rem; cursor: pointer;">
                      <input type="radio" name="ssh-key-mode" value="text"> Colar Texto
                   </label>
                </div>
                
                <div id="ssh-key-file-wrap" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                   <input type="file" id="cfg-ssh-key-file" style="font-size: 0.8rem;" accept=".pem,.key,">
                   <button class="btn-action" id="btn-load-key" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--surface-light);">Ler Arquivo</button>
                </div>
                
                <div id="ssh-key-text-wrap" style="display: none;">
                   <textarea id="cfg-ssh-key" class="form-input" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..." rows="3">${state.sshKey}</textarea>
                </div>
             </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-action" id="btn-cancel-settings">Cancelar</button>
          <button class="btn-action btn-primary" id="btn-save-settings">Salvar & Conectar</button>
        </div>
      </div>
    </div>
  `;

  createIcons({
    icons: {
      Activity, Server, Cpu, HardDrive, Wifi, Box, Terminal, Play, Square, RotateCw, Settings, CheckCircle2, AlertTriangle, ShieldCheck, Search, X
    }
  });

  // Re-attach event listeners
  setupEventListeners();
}

function renderCores(cores) {
  if (!cores || !cores.length) return '';
  return cores.map((percent, idx) => `
    <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
        <span>Core #${idx}</span>
        <span style="color: var(--text-primary); font-weight: 600;">${percent.toFixed(1)}%</span>
      </div>
      <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden;">
        <div style="height: 100%; width: ${percent}%; background: ${percent > 85 ? 'var(--accent-rose)' : (percent > 65 ? 'var(--accent-amber)' : 'var(--accent-cyan)')}; transition: width 0.4s ease;"></div>
      </div>
    </div>
  `).join('');
}

function renderDisks(disks) {
  if (!disks || !disks.length) return '<p style="color: var(--text-muted); font-size: 0.8rem;">Nenhum disco detectado.</p>';
  return disks.map(d => `
    <div class="disk-item-card">
      <div class="disk-item-header">
        <span style="font-family: var(--font-mono); color: var(--text-primary);">${d.mountpoint} <span style="color: var(--text-muted); font-size: 0.72rem;">(${d.device})</span></span>
        <span style="font-family: var(--font-mono); color: var(--accent-green);">${d.usedPercent.toFixed(1)}%</span>
      </div>
      <div class="metric-progress-track">
        <div class="metric-progress-bar" style="background: var(--accent-green); width: ${d.usedPercent}%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-secondary); font-family: var(--font-mono);">
        <span>Usado: ${formatBytes(d.used)}</span>
        <span>Livre: ${formatBytes(d.free)} / ${formatBytes(d.total)}</span>
      </div>
    </div>
  `).join('');
}

function renderDockerContainers(containers, filter = '') {
  if (!containers || !containers.length) {
    return `<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">Nenhum contêiner Docker encontrado.</div>`;
  }

  const filtered = containers.filter(c => 
    c.name.toLowerCase().includes(filter.toLowerCase()) || 
    c.image.toLowerCase().includes(filter.toLowerCase())
  );

  return filtered.map(c => {
    const isRunning = c.state === 'running';
    return `
      <div class="container-card">
        <div class="container-top">
          <div class="container-identity">
            <span class="container-name">
              <span class="pulse-dot" style="background-color: ${isRunning ? 'var(--accent-green)' : 'var(--accent-rose)'}; box-shadow: 0 0 6px ${isRunning ? 'var(--accent-green)' : 'var(--accent-rose)'};"></span>
              ${c.name}
            </span>
            <span class="container-image" title="${c.image}">${c.image}</span>
          </div>
          <span class="state-badge ${c.state}">${c.state}</span>
        </div>

        <!-- Telemetry Gauges for Container -->
        <div class="container-metrics-box">
          <div class="c-metric-col">
            <div class="c-metric-label">
              <span>CPU</span>
              <span class="c-metric-val">${c.cpuPercent.toFixed(1)}%</span>
            </div>
            <div class="c-bar-bg">
              <div class="c-bar-fill" style="width: ${Math.min(100, c.cpuPercent)}%"></div>
            </div>
          </div>

          <div class="c-metric-col">
            <div class="c-metric-label">
              <span>Memória</span>
              <span class="c-metric-val">${formatBytes(c.memoryUsage)}</span>
            </div>
            <div class="c-bar-bg">
              <div class="c-bar-fill mem" style="width: ${c.memoryPercent.toFixed(1)}%"></div>
            </div>
          </div>
        </div>

        <!-- Container I/O Details -->
        <div class="container-io-strip">
          <div class="container-io-item" title="Rede Recebida e Enviada">
            <i data-lucide="wifi" style="width: 14px; height: 14px; color: var(--accent-blue);"></i>
            <span>↓ ${formatBytes(c.networkRx)} | ↑ ${formatBytes(c.networkTx)}</span>
          </div>
          <div class="container-io-item" title="E/S de Armazenamento / Disco">
            <i data-lucide="hard-drive" style="width: 14px; height: 14px; color: var(--accent-purple);"></i>
            <span>${formatBytes(c.blockWrite)} Escritos</span>
          </div>
        </div>

        <!-- Ports -->
        ${c.ports && c.ports.length ? `
          <div class="container-ports">
            ${c.ports.map(p => `<span class="port-tag">${p}</span>`).join('')}
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="container-actions-bar">
          <button class="btn-ctrl btn-open-logs" data-id="${c.id}" data-name="${c.name}">
            <i data-lucide="terminal" style="width: 14px; height: 14px;"></i> Ver Logs
          </button>
          
          <div class="c-btn-group">
            ${isRunning ? `
              <button class="btn-ctrl btn-container-action" data-action="restart" data-id="${c.id}" title="Reiniciar">
                <i data-lucide="rotate-cw" style="width: 13px; height: 13px;"></i>
              </button>
              <button class="btn-ctrl btn-container-action" data-action="stop" data-id="${c.id}" title="Parar" style="color: var(--accent-rose);">
                <i data-lucide="square" style="width: 13px; height: 13px;"></i>
              </button>
            ` : `
              <button class="btn-ctrl btn-container-action" data-action="start" data-id="${c.id}" title="Iniciar" style="color: var(--accent-green);">
                <i data-lucide="play" style="width: 13px; height: 13px;"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderProcessesTable(processes, filter = '') {
  if (!processes || !processes.length) {
    return `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum processo encontrado.</td></tr>`;
  }

  const filtered = processes.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.user.toLowerCase().includes(filter.toLowerCase()) ||
    String(p.pid).includes(filter)
  );

  return filtered.map(p => `
    <tr>
      <td class="mono">${p.pid}</td>
      <td class="highlight">${p.name}</td>
      <td>${p.user}</td>
      <td class="mono" style="color: ${p.cpuPercent > 10 ? 'var(--accent-amber)' : 'inherit'};">${p.cpuPercent.toFixed(1)}%</td>
      <td class="mono">${p.memPercent.toFixed(1)}%</td>
      <td class="mono">${formatBytes(p.memRss)}</td>
      <td>
        <span style="font-family: var(--font-mono); font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06);">
          ${p.status}
        </span>
      </td>
    </tr>
  `).join('');
}

// Live UI Fast-Update (Without full DOM redraw for high fps)
function updateUIValues(data) {
  // Update header indicators
  const valUptime = document.getElementById('val-uptime');
  if (valUptime) valUptime.textContent = formatUptime(data.host.uptime);

  const valLoad = document.getElementById('val-load');
  if (valLoad) valLoad.textContent = `${data.host.load1.toFixed(2)} / ${data.host.load5.toFixed(2)} / ${data.host.load15.toFixed(2)}`;

  // CPU
  const valCpu = document.getElementById('val-cpu-total');
  const barCpu = document.getElementById('bar-cpu-total');
  if (valCpu) valCpu.textContent = data.cpu.totalPercent.toFixed(1);
  if (barCpu) barCpu.style.width = `${data.cpu.totalPercent}%`;

  // RAM
  const valRam = document.getElementById('val-ram-percent');
  const barRam = document.getElementById('bar-ram-used');
  const valRamUsed = document.getElementById('val-ram-used');
  const valRamCache = document.getElementById('val-ram-cache');
  if (valRam) valRam.textContent = data.memory.usedPercent.toFixed(1);
  if (barRam) barRam.style.width = `${data.memory.usedPercent}%`;
  if (valRamUsed) valRamUsed.textContent = `${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`;
  if (valRamCache) valRamCache.textContent = formatBytes(data.memory.available);

  // Network
  const valNetRx = document.getElementById('val-net-rx');
  const valNetTx = document.getElementById('val-net-tx');
  if (valNetRx && data.network[0]) {
    valNetRx.textContent = (data.network[0].bytesRecvPerSec / (1024 * 1024)).toFixed(1);
  }
  if (valNetTx && data.network[0]) {
    valNetTx.textContent = `${formatBytes(data.network[0].bytesSentPerSec)}/s`;
  }

  // Docker Counters
  const cntRunning = document.getElementById('docker-cnt-running');
  const cntPaused = document.getElementById('docker-cnt-paused');
  const cntStopped = document.getElementById('docker-cnt-stopped');
  const cntTotal = document.getElementById('docker-cnt-total');
  const badgeDockerCount = document.getElementById('badge-docker-count');
  if (cntRunning) cntRunning.textContent = data.docker.running;
  if (cntPaused) cntPaused.textContent = data.docker.paused;
  if (cntStopped) cntStopped.textContent = data.docker.stopped;
  if (cntTotal) cntTotal.textContent = data.docker.total;
  if (badgeDockerCount) badgeDockerCount.textContent = `${data.docker.running}/${data.docker.total}`;

  // Cores grid fast update
  const coresGrid = document.getElementById('cores-grid');
  if (coresGrid && state.activeTab === 'overview') {
    coresGrid.innerHTML = renderCores(data.cpu.perCorePercent);
  }

  // Update Charts
  const netIn = data.network[0]?.bytesRecvPerSec || 0;
  const netOut = data.network[0]?.bytesSentPerSec || 0;
  charts.update(data.cpu.totalPercent, netIn, netOut);

  // If on docker tab, update container cards
  if (state.activeTab === 'docker') {
    const cardsContainer = document.getElementById('docker-cards-container');
    if (cardsContainer) {
      cardsContainer.innerHTML = renderDockerContainers(data.docker.containers, state.containerFilter);
      createIcons({ icons: { Activity, Server, Cpu, HardDrive, Wifi, Box, Terminal, Play, Square, RotateCw, X } });
      bindContainerActionButtons();
    }
  }

  // If on processes tab, update tbody
  if (state.activeTab === 'processes') {
    const tbody = document.getElementById('processes-tbody');
    if (tbody) {
      tbody.innerHTML = renderProcessesTable(data.processes, state.processFilter);
    }
  }
}

// WebSocket Connection Manager
function connectWebSocket() {
  if (state.ws) {
    try { state.ws.close(); } catch (e) {}
  }

  const urlWithToken = state.wsToken ? `${state.wsUrl}?token=${encodeURIComponent(state.wsToken)}` : state.wsUrl;
  
  try {
    const ws = new WebSocket(urlWithToken);
    state.ws = ws;

    ws.onopen = () => {
      state.isConnected = true;
      state.isDemoMode = false;
      stopDemoLoop();
      updateConnBadge('connected', 'VPS Conectada');

      if (state.collectMode === 'ssh') {
        ws.send(JSON.stringify({
          type: 'set_mode_ssh',
          sshHost: state.sshHost,
          sshUser: state.sshUser,
          sshKey: state.sshKey
        }));
      } else {
        ws.send(JSON.stringify({ type: 'set_mode_local' }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'stats') {
          state.data = payload.data;
          updateUIValues(state.data);
        } else if (payload.type === 'log_chunk') {
          appendLog(payload.data);
        } else if (payload.type === 'info') {
          console.log('[INFO]', payload.data);
        } else if (payload.type === 'error') {
          console.error('[ERROR]', payload.data);
          alert('Erro no agente: ' + payload.data);
        }
      } catch (err) {
        console.error('Erro ao processar pacote de telemetria:', err);
      }
    };

    ws.onclose = () => {
      state.isConnected = false;
      if (!state.isDemoMode) {
        updateConnBadge('reconnecting', 'Reconectando em 3s...');
        setTimeout(() => {
          if (!state.isDemoMode && !state.isConnected) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    ws.onerror = () => {
      state.isConnected = false;
      if (!state.isDemoMode) {
        updateConnBadge('disconnected', 'Falha na Conexão');
      }
    };
  } catch (err) {
    console.error('Falha ao iniciar WebSocket:', err);
    state.isConnected = false;
    updateConnBadge('disconnected', 'Erro WebSocket');
  }
}

function updateConnBadge(status, text) {
  const badge = document.getElementById('conn-badge');
  const txt = document.getElementById('conn-status-text');
  if (!badge || !txt) return;

  badge.className = `status-badge ${status === 'connected' ? '' : (status === 'demo' ? 'demo-mode' : (status === 'reconnecting' ? 'reconnecting' : 'disconnected'))}`;
  txt.textContent = text;
}

function startDemoLoop() {
  stopDemoLoop();
  demoInterval = setInterval(() => {
    state.data = tickMockData(state.data);
    updateUIValues(state.data);
  }, 1000);
}

function stopDemoLoop() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
}

// Event Listeners & Interactions
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      state.activeTab = tab;
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('tab-overview').style.display = tab === 'overview' ? 'flex' : 'none';
      document.getElementById('tab-docker').style.display = tab === 'docker' ? 'flex' : 'none';
      document.getElementById('tab-processes').style.display = tab === 'processes' ? 'flex' : 'none';

      if (tab === 'docker') {
        const cardsContainer = document.getElementById('docker-cards-container');
        if (cardsContainer) {
          cardsContainer.innerHTML = renderDockerContainers(state.data.docker.containers, state.containerFilter);
          createIcons({ icons: { Activity, Server, Cpu, HardDrive, Wifi, Box, Terminal, Play, Square, RotateCw, X } });
          bindContainerActionButtons();
        }
      }
    });
  });

  // Toggle Demo Mode
  const btnToggleDemo = document.getElementById('btn-toggle-demo');
  if (btnToggleDemo) {
    btnToggleDemo.addEventListener('click', () => {
      state.isDemoMode = !state.isDemoMode;
      if (state.isDemoMode) {
        if (state.ws) {
          try { state.ws.close(); } catch(e){}
        }
        startDemoLoop();
        updateConnBadge('demo', 'Modo Demonstração (Simulação)');
        btnToggleDemo.classList.add('btn-primary');
        btnToggleDemo.querySelector('span').textContent = 'Usar VPS Real';
      } else {
        stopDemoLoop();
        btnToggleDemo.classList.remove('btn-primary');
        btnToggleDemo.querySelector('span').textContent = 'Modo Demonstração';
        updateConnBadge('reconnecting', 'Conectando ao Agente...');
        connectWebSocket();
      }
    });
  }

  // Settings Modal
  const modalSettings = document.getElementById('modal-settings');
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnCancelSettings = document.getElementById('btn-cancel-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  const radioConnModes = document.querySelectorAll('input[name="cfg-connection-mode"]');
  const localFields = document.getElementById('cfg-mode-local-fields');
  const sshFields = document.getElementById('cfg-mode-ssh-fields');
  
  if (radioConnModes.length) {
    radioConnModes.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'local') {
          if (localFields) localFields.style.display = 'block';
          if (sshFields) sshFields.style.display = 'none';
        } else {
          if (localFields) localFields.style.display = 'none';
          if (sshFields) sshFields.style.display = 'block';
        }
      });
    });
  }

  const radioKeyModes = document.querySelectorAll('input[name="ssh-key-mode"]');
  const sshKeyFileWrap = document.getElementById('ssh-key-file-wrap');
  const sshKeyTextWrap = document.getElementById('ssh-key-text-wrap');

  if (radioKeyModes.length) {
     radioKeyModes.forEach(radio => {
        radio.addEventListener('change', (e) => {
           if (e.target.value === 'file') {
              if (sshKeyFileWrap) sshKeyFileWrap.style.display = 'flex';
              if (sshKeyTextWrap) sshKeyTextWrap.style.display = 'none';
           } else {
              if (sshKeyFileWrap) sshKeyFileWrap.style.display = 'none';
              if (sshKeyTextWrap) sshKeyTextWrap.style.display = 'block';
           }
        });
     });
  }

  const sshKeyFile = document.getElementById('cfg-ssh-key-file');
  const btnLoadKey = document.getElementById('btn-load-key');
  if (btnLoadKey && sshKeyFile) {
    btnLoadKey.addEventListener('click', () => {
      if (!sshKeyFile.files.length) {
         alert("Por favor, selecione um arquivo de chave privada primeiro.");
         return;
      }
      const file = sshKeyFile.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
         document.getElementById('cfg-ssh-key').value = e.target.result;
         alert("Arquivo lido com sucesso! A chave está em memória, você já pode Salvar e Conectar.");
      };
      reader.readAsText(file);
    });
  }

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      document.getElementById('cfg-ws-url').value = state.wsUrl;
      document.getElementById('cfg-ws-token').value = state.wsToken;
      
      const hostInput = document.getElementById('cfg-ssh-host');
      if (hostInput) hostInput.value = state.sshHost;
      const userInput = document.getElementById('cfg-ssh-user');
      if (userInput) userInput.value = state.sshUser;
      const keyInput = document.getElementById('cfg-ssh-key');
      if (keyInput) keyInput.value = state.sshKey;
      
      // Select the correct radio option
      const rd = document.querySelector(`input[name="cfg-connection-mode"][value="${state.collectMode}"]`);
      if (rd) rd.checked = true;

      if (localFields) localFields.style.display = state.collectMode === 'local' ? 'block' : 'none';
      if (sshFields) sshFields.style.display = state.collectMode === 'ssh' ? 'block' : 'none';

      modalSettings.classList.add('open');
    });
  }
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => modalSettings.classList.remove('open'));
  if (btnCancelSettings) btnCancelSettings.addEventListener('click', () => modalSettings.classList.remove('open'));

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const selectedMode = document.querySelector('input[name="cfg-connection-mode"]:checked')?.value || 'local';
      
      let urlInput = document.getElementById('cfg-ws-url').value.trim();
      const tokenInput = document.getElementById('cfg-ws-token').value.trim();
      const sshHostInput = document.getElementById('cfg-ssh-host') ? document.getElementById('cfg-ssh-host').value.trim() : '';
      const sshUserInput = document.getElementById('cfg-ssh-user') ? document.getElementById('cfg-ssh-user').value.trim() : '';
      const sshKeyInput = document.getElementById('cfg-ssh-key') ? document.getElementById('cfg-ssh-key').value.trim() : '';

      if (selectedMode === 'ssh') {
         // Auto infer wsUrl to self if using SSH agentless
         const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
         const host = window.location.host;
         urlInput = `${proto}//${host}/ws`;
      }

      state.wsUrl = urlInput || 'ws://localhost:8080/ws';
      state.wsToken = tokenInput;
      state.collectMode = selectedMode;
      state.sshHost = sshHostInput;
      state.sshUser = sshUserInput;
      state.sshKey = sshKeyInput;

      localStorage.setItem('vps_agent_url', state.wsUrl);
      localStorage.setItem('vps_agent_token', state.wsToken);
      localStorage.setItem('vps_agent_mode', state.collectMode);
      localStorage.setItem('vps_agent_ssh_host', state.sshHost);
      localStorage.setItem('vps_agent_ssh_user', state.sshUser);
      localStorage.setItem('vps_agent_ssh_key', state.sshKey);

      modalSettings.classList.remove('open');

      if (!state.isDemoMode) {
        connectWebSocket();
      }
    });
  }

  // Logs Modal
  const modalLogs = document.getElementById('modal-logs');
  const btnCloseLogs = document.getElementById('btn-close-logs');
  const btnCloseLogsModal = document.getElementById('btn-close-logs-modal');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  if (btnCloseLogs) btnCloseLogs.addEventListener('click', () => modalLogs.classList.remove('open'));
  if (btnCloseLogsModal) btnCloseLogsModal.addEventListener('click', () => modalLogs.classList.remove('open'));
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      document.getElementById('terminal-content').textContent = '';
    });
  }

  // Filters
  const inputFilterDocker = document.getElementById('input-filter-docker');
  if (inputFilterDocker) {
    inputFilterDocker.addEventListener('input', (e) => {
      state.containerFilter = e.target.value;
      const cardsContainer = document.getElementById('docker-cards-container');
      if (cardsContainer) {
        cardsContainer.innerHTML = renderDockerContainers(state.data.docker.containers, state.containerFilter);
        createIcons({ icons: { Activity, Server, Cpu, HardDrive, Wifi, Box, Terminal, Play, Square, RotateCw, X } });
        bindContainerActionButtons();
      }
    });
  }

  const inputFilterProcesses = document.getElementById('input-filter-processes');
  if (inputFilterProcesses) {
    inputFilterProcesses.addEventListener('input', (e) => {
      state.processFilter = e.target.value;
      const tbody = document.getElementById('processes-tbody');
      if (tbody) {
        tbody.innerHTML = renderProcessesTable(state.data.processes, state.processFilter);
      }
    });
  }

  bindContainerActionButtons();
}

function bindContainerActionButtons() {
  // Container Action Buttons (Start, Stop, Restart)
  document.querySelectorAll('.btn-container-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const containerId = btn.getAttribute('data-id');
      
      if (state.isDemoMode) {
        // Simulated action
        const container = state.data.docker.containers.find(c => c.id === containerId);
        if (container) {
          if (action === 'stop') {
            container.state = 'exited';
            container.status = 'Exited (0) Just now';
            container.cpuPercent = 0;
            state.data.docker.running = Math.max(0, state.data.docker.running - 1);
            state.data.docker.stopped++;
          } else if (action === 'start') {
            container.state = 'running';
            container.status = 'Up Less than a second';
            container.cpuPercent = 2.5;
            state.data.docker.running++;
            state.data.docker.stopped = Math.max(0, state.data.docker.stopped - 1);
          } else if (action === 'restart') {
            container.state = 'running';
            container.status = 'Up Less than a second';
          }
          updateUIValues(state.data);
        }
        return;
      }

      // Live Agent HTTP Action
      try {
        const agentHttpUrl = state.wsUrl.replace(/^ws/, 'http').replace(/\/ws$/, '');
        const res = await fetch(`${agentHttpUrl}/api/containers/${containerId}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.wsToken ? { 'Authorization': `Bearer ${state.wsToken}` } : {})
          },
          body: JSON.stringify({ action })
        });
        if (!res.ok) alert(`Falha na ação ${action}: ${await res.text()}`);
      } catch (err) {
        alert(`Erro de conexão com o agente: ${err.message}`);
      }
    });
  });

  // Open Logs Modal
  document.querySelectorAll('.btn-open-logs').forEach(btn => {
    btn.addEventListener('click', () => {
      const containerId = btn.getAttribute('data-id');
      const containerName = btn.getAttribute('data-name');
      openContainerLogs(containerId, containerName);
    });
  });
}

function openContainerLogs(containerId, containerName) {
  const modal = document.getElementById('modal-logs');
  const title = document.getElementById('modal-log-title');
  const terminal = document.getElementById('terminal-content');

  title.textContent = `${containerName} (${containerId.substring(0, 10)})`;
  terminal.textContent = 'Carregando stream de logs...\n';
  modal.classList.add('open');

  if (state.isDemoMode) {
    terminal.textContent = `[DEMO MODE] Logs simulados para ${containerName}:\n`;
    const mockLogs = [
      `2026-10-01 21:10:02.102 [INFO] Initializing service container '${containerName}'...`,
      `2026-10-01 21:10:02.145 [INFO] Configuration loaded from environment variables`,
      `2026-10-01 21:10:02.210 [INFO] TCP listener opened on 0.0.0.0`,
      `2026-10-01 21:10:03.001 [INFO] Connected to upstream cluster, latency 0.8ms`,
      `2026-10-01 21:15:20.400 [DEBUG] Health check ping: 200 OK`,
      `2026-10-01 21:20:00.000 [INFO] Processed 14,200 incoming requests without errors`,
      `2026-10-01 21:22:15.890 [DEBUG] Garbage collection complete (duration 1.2ms)`
    ];
    mockLogs.forEach((line, i) => {
      setTimeout(() => {
        terminal.textContent += `${line}\n`;
        terminal.scrollTop = terminal.scrollHeight;
      }, i * 150);
    });
    return;
  }

  // Live stream via WebSocket request or HTTP
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'subscribe_logs', containerId }));
  }
}

function appendLog(line) {
  const terminal = document.getElementById('terminal-content');
  if (terminal) {
    terminal.textContent += `${line}\n`;
    terminal.scrollTop = terminal.scrollHeight;
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  renderApp();
  charts.init('chart-cpu', 'chart-net');
  startDemoLoop();
});
