import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Ship,
  Anchor,
  Activity,
  TrendingUp,
  Loader2,
  AlertCircle,
  ChevronDown,
  Search,
  Bell,
} from "lucide-react";

// Custom Tooltip for Trend (Cargo Only)
const CustomTrendTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface-card p-4 rounded-lg shadow-elevation border border-surface-divider min-w-[200px]">
        <p className="text-sm font-bold text-foreground border-b border-surface-divider pb-2 mb-2">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((p, idx) => {
            const name = p.name || p.dataKey;
            const value = p.value || 0;
            return (
              <div
                key={idx}
                className="flex justify-between items-center gap-4 text-xs"
              >
                <span className="text-text-secondary font-medium">
                  {name}
                </span>
                <span className="text-foreground font-bold">
                  {Number(value).toLocaleString()} Ton
                </span>
              </div>
            );
          })}
          <div className="border-t border-surface-divider pt-2 mt-2 flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-text-muted">
              Total Volume
            </span>
            <span className="text-sm font-black text-primary">
              {payload.reduce((sum, p) => sum + (p.value || 0), 0).toLocaleString()} Ton
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const DashboardPage = () => {
  // --- TREND FILTERS & STATE ---
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [trendType, setTrendType] = useState("Bongkar");
  const [trendData, setTrendData] = useState([]);
  const [trendSeries, setTrendSeries] = useState([]);
  const [medianValue, setMedianValue] = useState(0);

  const [stats, setStats] = useState({
    today_unit: 0,
    today_loa: 0,
    all_time_unit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTrendData();
  }, [selectedYear, trendType]);

  const fetchStats = async () => {
    try {
      const resStats = await axios.get(
        "http://127.0.0.1:8000/api/dashboard/stats"
      );
      setStats(resStats.data);
    } catch (err) {
      console.error("Gagal ambil stats:", err);
    }
  };

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(
        `http://127.0.0.1:8000/api/dashboard/trend?tahun=${selectedYear}&jenis_trend=${trendType}`
      );

      if (res.data && res.data.data) {
        setTrendData(res.data.data);
        setTrendSeries(res.data.series || []);
        setMedianValue(res.data.median);
      }
    } catch (err) {
      console.error("Gagal ambil trend:", err);
      setError("Gagal memuat data trend. Periksa koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  // helper for colors
  const getColor = (name, index) => {
    const CARGO_COLORS = {
      "AMM. NITRATE": "#FACC15",
      AMONIA: "#A855F7",
      LNG: "#3B82F6",
      LPG: "#EF4444",
      PUPUK: "#22C55E",
      BARANG: "#64748B",
      DEFAULT: "#94A3B8",
    };
    if (CARGO_COLORS[name]) return CARGO_COLORS[name];
    const colors = [
      "#F58220",
      "#E11D48",
      "#0072CE",
      "#6DBE45",
      "#0F2A44",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="ml-64 bg-background min-h-screen font-sans text-foreground">
      {/* HEADER AREA */}
      <div className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-md border-b border-surface-divider px-8 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Dashboard Utama
          </h2>
          <p className="text-text-secondary text-xs font-medium mt-1">
            Overview operasional & analisis performa
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="hidden md:flex items-center relative">
            <Search size={16} className="absolute left-3 text-text-muted" />
            <input
              type="text"
              placeholder="Cari data..."
              className="pl-9 pr-4 py-2 bg-background border border-surface-divider rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-text-secondary hover:text-accent transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-accent rounded-full border border-white"></span>
            </button>
            <div className="bg-success/10 px-3 py-1.5 rounded-full border border-success/20 flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-success-700 uppercase tracking-widest">
                System Online
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-surface-card p-6 rounded-lg shadow-soft border border-surface-divider flex items-center gap-5 hover:shadow-elevation hover:border-primary/20 transition-all duration-300 group">
            <div className="p-4 bg-primary-50 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
              <Ship size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                Kapal Masuk (Hari Ini)
              </p>
              <h3 className="text-3xl font-bold text-foreground tracking-tight">
                {stats.today_unit}{" "}
                <span className="text-sm font-semibold text-text-secondary">
                  Unit
                </span>
              </h3>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-card p-6 rounded-lg shadow-soft border border-surface-divider flex items-center gap-5 hover:shadow-elevation hover:border-success/20 transition-all duration-300 group">
            <div className="p-4 bg-success-50 text-success rounded-2xl group-hover:bg-success group-hover:text-white transition-colors">
              <Anchor size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                Total LOA (Hari Ini)
              </p>
              <h3 className="text-3xl font-bold text-foreground tracking-tight">
                {parseFloat(stats.today_loa).toLocaleString()}{" "}
                <span className="text-sm font-semibold text-text-secondary">
                  m
                </span>
              </h3>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-card p-6 rounded-lg shadow-soft border border-surface-divider flex items-center gap-5 hover:shadow-elevation hover:border-accent/20 transition-all duration-300 group">
            <div className="p-4 bg-accent-50 text-accent rounded-2xl group-hover:bg-accent group-hover:text-white transition-colors">
              <Activity size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                Total Data Tersimpan
              </p>
              <h3 className="text-3xl font-bold text-foreground tracking-tight">
                {stats.all_time_unit}{" "}
                <span className="text-sm font-semibold text-text-secondary">
                  Entries
                </span>
              </h3>
            </div>
          </div>
        </div>

        {/* CHART SECTION */}
        <div className="bg-surface-card p-8 rounded-lg shadow-soft border border-surface-divider relative overflow-hidden">
          {/* Chart Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Analisis Tren Realisasi
                </h3>
                <p className="text-text-muted text-xs font-medium">
                  Januari - Desember {selectedYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Type Toggle */}
              <div className="flex bg-background p-1 rounded-lg border border-surface-divider">
                <button
                  onClick={() => setTrendType("Bongkar")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    trendType === "Bongkar"
                      ? "bg-surface-card text-primary shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  Bongkar
                </button>
                <button
                  onClick={() => setTrendType("Muat")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    trendType === "Muat"
                      ? "bg-surface-card text-primary shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  Muat
                </button>
              </div>

              {/* Year Selector */}
              <div className="relative group">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="appearance-none bg-background border border-surface-divider text-text-secondary text-xs font-bold py-2 pl-4 pr-10 rounded-lg cursor-pointer focus:outline-none focus:border-primary hover:border-primary/50 transition-colors"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-card/80 z-20 backdrop-blur-[2px]">
                <Loader2 className="text-primary animate-spin mb-3" size={32} />
                <p className="text-sm font-bold text-text-secondary">
                  Memproses data...
                </p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/50 z-20">
                <AlertCircle className="text-red-400 mb-3" size={32} />
                <p className="text-sm font-bold text-red-500">{error}</p>
                <button
                  onClick={fetchTrendData}
                  className="mt-4 px-6 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            <div style={{ width: "100%", height: 400 }}>
              <ResponsiveContainer>
                <LineChart
                  data={trendData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E3E8EE"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9AA7B5", fontWeight: 600 }}
                    dy={15}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9AA7B5", fontWeight: 600 }}
                    dx={-10}
                  />

                  <Tooltip
                    content={<CustomTrendTooltip />}
                    cursor={{
                      stroke: "#0072CE",
                      strokeWidth: 1.5,
                      strokeDasharray: "5 5",
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={40}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">
                        {value}
                      </span>
                    )}
                  />

                  {/* Reference Line (Median) */}
                  <ReferenceLine
                    y={medianValue}
                    stroke="#F58220"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      position: "right",
                      value: `Median: ${medianValue}`,
                      fill: "#F58220",
                      fontSize: 10,
                      fontWeight: 700,
                      offset: 10,
                    }}
                  />

                  {trendSeries.map((serie, index) => (
                    <Line
                      key={serie}
                      name={serie}
                      type="monotone"
                      dataKey={serie}
                      stroke={getColor(serie, index)}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: getColor(serie, index) }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: getColor(serie, index) }}
                      animationDuration={1500}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FOOTER INFO */}
          <div className="mt-6 pt-6 border-t border-surface-divider flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Real Data
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-accent border-t border-dashed"></div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Median Threshold
                </span>
              </div>
            </div>
            <p className="text-[10px] font-medium text-text-muted italic">
              *Data diperbarui secara real-time dari entri operator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
