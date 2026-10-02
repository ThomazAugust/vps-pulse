package models

type HostInfo struct {
	Hostname      string  `json:"hostname"`
	OS            string  `json:"os"`
	Platform      string  `json:"platform"`
	KernelVersion string  `json:"kernelVersion"`
	Uptime        uint64  `json:"uptime"`
	Load1         float64 `json:"load1"`
	Load5         float64 `json:"load5"`
	Load15        float64 `json:"load15"`
}

type CPUInfo struct {
	ModelName      string    `json:"modelName"`
	TotalPercent   float64   `json:"totalPercent"`
	CoresCount     int       `json:"coresCount"`
	Mhz            float64   `json:"mhz"`
	PerCorePercent []float64 `json:"perCorePercent"`
}

type MemoryInfo struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"usedPercent"`
	Cached      uint64  `json:"cached"`
	Buffers     uint64  `json:"buffers"`
	SwapTotal   uint64  `json:"swapTotal"`
	SwapUsed    uint64  `json:"swapUsed"`
	SwapPercent float64 `json:"swapPercent"`
}

type DiskInfo struct {
	Device          string  `json:"device"`
	Mountpoint      string  `json:"mountpoint"`
	FsType          string  `json:"fsType"`
	Total           uint64  `json:"total"`
	Used            uint64  `json:"used"`
	Free            uint64  `json:"free"`
	UsedPercent     float64 `json:"usedPercent"`
	ReadBytesPerSec uint64  `json:"readBytesPerSec"`
	WriteBytesPerSec uint64 `json:"writeBytesPerSec"`
}

type NetInfo struct {
	Interface       string `json:"interface"`
	BytesSent       uint64 `json:"bytesSent"`
	BytesRecv       uint64 `json:"bytesRecv"`
	BytesSentPerSec uint64 `json:"bytesSentPerSec"`
	BytesRecvPerSec uint64 `json:"bytesRecvPerSec"`
	PacketsSent     uint64 `json:"packetsSent"`
	PacketsRecv     uint64 `json:"packetsRecv"`
}

type ContainerInfo struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Image         string   `json:"image"`
	State         string   `json:"state"` // running, exited, paused
	Status        string   `json:"status"` // Up 2 days, etc.
	Ports         []string `json:"ports"`
	CPUPercent    float64  `json:"cpuPercent"`
	MemoryUsage   uint64   `json:"memoryUsage"`
	MemoryLimit   uint64   `json:"memoryLimit"`
	MemoryPercent float64  `json:"memoryPercent"`
	NetworkRx     uint64   `json:"networkRx"`
	NetworkTx     uint64   `json:"networkTx"`
	BlockRead     uint64   `json:"blockRead"`
	BlockWrite    uint64   `json:"blockWrite"`
}

type DockerSummary struct {
	Total      int             `json:"total"`
	Running    int             `json:"running"`
	Paused     int             `json:"paused"`
	Stopped    int             `json:"stopped"`
	Containers []ContainerInfo `json:"containers"`
}

type ProcessInfo struct {
	PID         int32   `json:"pid"`
	Name        string  `json:"name"`
	User        string  `json:"user"`
	CPUPercent  float64 `json:"cpuPercent"`
	MemPercent  float32 `json:"memPercent"`
	MemRSS      uint64  `json:"memRss"`
	Status      string  `json:"status"`
}

type SystemPayload struct {
	Host      HostInfo      `json:"host"`
	CPU       CPUInfo       `json:"cpu"`
	Memory    MemoryInfo    `json:"memory"`
	Disks     []DiskInfo    `json:"disks"`
	Network   []NetInfo     `json:"network"`
	Docker    DockerSummary `json:"docker"`
	Processes []ProcessInfo `json:"processes"`
}

type WsMessage struct {
	Type string      `json:"type"` // "stats" | "log_chunk" | "error"
	Data interface{} `json:"data"`
}
