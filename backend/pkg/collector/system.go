package collector

import (
	"sort"
	"strings"
	"sync"
	"time"

	"vps-panel-agent/pkg/models"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

type SystemCollector struct {
	mu           sync.Mutex
	lastNet      map[string]net.IOCountersStat
	lastDisk     map[string]disk.IOCountersStat
	lastTickTime time.Time
}

func NewSystemCollector() *SystemCollector {
	return &SystemCollector{
		lastNet:      make(map[string]net.IOCountersStat),
		lastDisk:     make(map[string]disk.IOCountersStat),
		lastTickTime: time.Now(),
	}
}

func (c *SystemCollector) Collect() (models.HostInfo, models.CPUInfo, models.MemoryInfo, []models.DiskInfo, []models.NetInfo, []models.ProcessInfo) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(c.lastTickTime).Seconds()
	if elapsed <= 0 {
		elapsed = 1
	}
	c.lastTickTime = now

	// 1. Host Info
	hInfo := models.HostInfo{
		Hostname: "unknown",
		OS:       "linux",
	}
	if h, err := host.Info(); err == nil {
		hInfo.Hostname = h.Hostname
		hInfo.OS = h.OS + " " + h.PlatformVersion
		hInfo.Platform = h.Platform
		hInfo.KernelVersion = h.KernelVersion
		hInfo.Uptime = h.Uptime
	}
	if l, err := load.Avg(); err == nil {
		hInfo.Load1 = l.Load1
		hInfo.Load5 = l.Load5
		hInfo.Load15 = l.Load15
	}

	// 2. CPU Info
	cpuInfo := models.CPUInfo{
		ModelName:  "CPU",
		CoresCount: 1,
	}
	if cInfo, err := cpu.Info(); err == nil && len(cInfo) > 0 {
		cpuInfo.ModelName = cInfo[0].ModelName
		cpuInfo.Mhz = cInfo[0].Mhz
		cpuInfo.CoresCount = len(cInfo)
	}
	if totalP, err := cpu.Percent(0, false); err == nil && len(totalP) > 0 {
		cpuInfo.TotalPercent = totalP[0]
	}
	if perP, err := cpu.Percent(0, true); err == nil {
		cpuInfo.PerCorePercent = perP
		if cpuInfo.CoresCount < len(perP) {
			cpuInfo.CoresCount = len(perP)
		}
	}

	// 3. Memory Info
	memInfo := models.MemoryInfo{}
	if v, err := mem.VirtualMemory(); err == nil {
		memInfo.Total = v.Total
		memInfo.Used = v.Used
		memInfo.Free = v.Free
		memInfo.Available = v.Available
		memInfo.UsedPercent = v.UsedPercent
		memInfo.Cached = v.Cached
		memInfo.Buffers = v.Buffers
	}
	if s, err := mem.SwapMemory(); err == nil {
		memInfo.SwapTotal = s.Total
		memInfo.SwapUsed = s.Used
		memInfo.SwapPercent = s.UsedPercent
	}

	// 4. Disks Info
	var diskList []models.DiskInfo
	diskIOCounters, _ := disk.IOCounters()
	if partitions, err := disk.Partitions(false); err == nil {
		seenMounts := make(map[string]bool)
		for _, p := range partitions {
			if seenMounts[p.Mountpoint] {
				continue
			}
			// Filter pseudo filesystems
			if strings.HasPrefix(p.Mountpoint, "/proc") || strings.HasPrefix(p.Mountpoint, "/sys") || strings.HasPrefix(p.Mountpoint, "/dev") {
				continue
			}
			seenMounts[p.Mountpoint] = true

			usage, err := disk.Usage(p.Mountpoint)
			if err != nil {
				continue
			}

			d := models.DiskInfo{
				Device:      p.Device,
				Mountpoint:  p.Mountpoint,
				FsType:      p.Fstype,
				Total:       usage.Total,
				Used:        usage.Used,
				Free:        usage.Free,
				UsedPercent: usage.UsedPercent,
			}

			// Disk I/O rate
			devName := strings.TrimPrefix(p.Device, "/dev/")
			if currIO, ok := diskIOCounters[devName]; ok {
				if prevIO, had := c.lastDisk[devName]; had {
					if currIO.ReadBytes >= prevIO.ReadBytes {
						d.ReadBytesPerSec = uint64(float64(currIO.ReadBytes-prevIO.ReadBytes) / elapsed)
					}
					if currIO.WriteBytes >= prevIO.WriteBytes {
						d.WriteBytesPerSec = uint64(float64(currIO.WriteBytes-prevIO.WriteBytes) / elapsed)
					}
				}
				c.lastDisk[devName] = currIO
			}

			diskList = append(diskList, d)
		}
	}

	// 5. Network Info
	var netList []models.NetInfo
	if ioCounters, err := net.IOCounters(true); err == nil {
		for _, io := range ioCounters {
			// Skip loopback for main view if desired, or keep
			n := models.NetInfo{
				Interface:   io.Name,
				BytesSent:   io.BytesSent,
				BytesRecv:   io.BytesRecv,
				PacketsSent: io.PacketsSent,
				PacketsRecv: io.PacketsRecv,
			}

			if prev, ok := c.lastNet[io.Name]; ok {
				if io.BytesSent >= prev.BytesSent {
					n.BytesSentPerSec = uint64(float64(io.BytesSent-prev.BytesSent) / elapsed)
				}
				if io.BytesRecv >= prev.BytesRecv {
					n.BytesRecvPerSec = uint64(float64(io.BytesRecv-prev.BytesRecv) / elapsed)
				}
			}
			c.lastNet[io.Name] = io

			netList = append(netList, n)
		}
	}

	// 6. Top Processes (Top 10 sorted by CPU / Mem)
	var procList []models.ProcessInfo
	if procs, err := process.Processes(); err == nil {
		for _, p := range procs {
			name, err := p.Name()
			if err != nil || name == "" {
				continue
			}
			cpuP, _ := p.CPUPercent()
			memP, _ := p.MemoryPercent()
			memInfo, _ := p.MemoryInfo()
			user, _ := p.Username()
			status, _ := p.Status()

			rss := uint64(0)
			if memInfo != nil {
				rss = memInfo.RSS
			}

			statusStr := "S"
			if len(status) > 0 {
				statusStr = status[0]
			}

			procList = append(procList, models.ProcessInfo{
				PID:         p.Pid,
				Name:        name,
				User:        user,
				CPUPercent:  cpuP,
				MemPercent:  memP,
				MemRSS:      rss,
				Status:      statusStr,
			})
		}

		// Sort by CPU percent descending
		sort.Slice(procList, func(i, j int) bool {
			return procList[i].CPUPercent > procList[j].CPUPercent
		})
		if len(procList) > 15 {
			procList = procList[:15]
		}
	}

	return hInfo, cpuInfo, memInfo, diskList, netList, procList
}
