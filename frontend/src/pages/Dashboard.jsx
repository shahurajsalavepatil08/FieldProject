import { useEffect, useRef, useState, useCallback } from "react";
import { api, downloadPdf } from "@/lib/api";
import { Thermometer, WaveSquare, SpeakerHigh, Lightning, DownloadSimple } from "@phosphor-icons/react";
import MachineSelector from "@/components/MachineSelector";
import SensorCard from "@/components/SensorCard";
import HealthGauge from "@/components/HealthGauge";
import StatusBanner from "@/components/StatusBanner";
import TrendChart from "@/components/TrendChart";
import AIPanel from "@/components/AIPanel";
import AlertsList from "@/components/AlertsList";
import { toast } from "sonner";

export default function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [active, setActive] = useState("m1");
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [insight, setInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [th, setTh] = useState(null);
  const lastAlertId = useRef(null);

  useEffect(() => {
    api.get("/machines").then((r) => setMachines(r.data));
    api.get("/thresholds").then((r) => setTh(r.data));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [d, h, a] = await Promise.all([
        api.get(`/get-data?machine_id=${active}`),
        api.get(`/history?machine_id=${active}&hours=1&limit=80`),
        api.get(`/alerts?machine_id=${active}&limit=20`),
      ]);
      setCurrent(d.data);
      setHistory(h.data);
      setAlerts(a.data);
      // toast new alerts
      if (a.data.length && a.data[0].id !== lastAlertId.current) {
        if (lastAlertId.current !== null) {
          const ev = a.data[0];
          (ev.type === "critical" ? toast.error : toast.warning)(ev.message, {
            description: ev.machine_name,
          });
        }
        lastAlertId.current = a.data[0].id;
      }
    } catch (e) {
      // silently ignore - token could be stale
    }
  }, [active]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const runInsight = useCallback(async () => {
    setAiLoading(true);
    try {
      const r = await api.get(`/ai-insights?machine_id=${active}`);
      setInsight(r.data);
    } catch (e) {
      toast.error("AI analysis failed");
    } finally { setAiLoading(false); }
  }, [active]);

  useEffect(() => { runInsight(); }, [runInsight]);

  const handleDownload = async () => {
    try {
      await downloadPdf(active, 1);
      toast.success("Report downloaded");
    } catch (e) { toast.error("Download failed"); }
  };

  const activeMachine = machines.find((m) => m.id === active);

  return (
    <div className="space-y-5" data-testid="dashboard">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="mono text-[10px] tracking-[0.3em] text-[var(--primary)]">CONTROL ROOM</div>
          <h1 className="text-3xl sm:text-4xl font-bold">Live Operations</h1>
          <p className="text-sm text-white/50 mt-1">
            Realtime sensor telemetry · AI-assisted diagnosis · auto-refresh every 3s
          </p>
        </div>
        <button onClick={handleDownload} data-testid="download-report-btn"
          className="btn-primary flex items-center gap-2 self-start md:self-auto">
          <DownloadSimple size={14} weight="bold"/> DOWNLOAD REPORT
        </button>
      </div>

      <MachineSelector machines={machines} active={active} onSelect={setActive}/>

      <StatusBanner status={current?.status} machineName={activeMachine?.name} timestamp={current?.timestamp}/>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SensorCard icon={Thermometer} label="TEMPERATURE" value={current?.temperature}
          unit="°C" warn={th?.temp_warning || 55} crit={th?.temp_critical || 75}
          testid="sensor-temperature"/>
        <SensorCard icon={WaveSquare} label="VIBRATION" value={current?.vibration}
          unit="g" warn={th?.vib_warning || 1.2} crit={th?.vib_critical || 1.8}
          testid="sensor-vibration"/>
        <SensorCard icon={SpeakerHigh} label="SOUND" value={current?.sound}
          unit="dB" warn={th?.sound_warning || 80} crit={th?.sound_critical || 95}
          testid="sensor-sound"/>
        <SensorCard icon={Lightning} label="CURRENT" value={current?.current}
          unit="A" warn={th?.current_warning || 6.5} crit={th?.current_critical || 8}
          testid="sensor-current"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HealthGauge value={current?.health || 0} status={current?.status || "NORMAL"}/>
        </div>
        <div>
          <AIPanel insight={insight} loading={aiLoading} onRefresh={runInsight}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrendChart data={history}/>
        </div>
        <div>
          <AlertsList alerts={alerts}/>
        </div>
      </div>
    </div>
  );
}
