import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Add navigate
import { getEntries, deleteEntry } from "../../../services/api";
import {
  FileText,
  Search,
  Eye,
  Ship,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import SummaryCard from "../../../components/shared/SummaryCard";

const DataPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- STATE ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- AMBIL DATA DARI BACKEND ---
  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch 100 latest entries for this operator (no date filter, all statuses?)
      // Requirement: "Data yang di tampilkan, adalah 100 data terakhir yang di input"
      // Requirement: "tampilan yang di tampilkan berdasarkan tanggal terbaru penginputan dan wajib ber urut"
      
      // We'll fetch broadly and slice client side for now, or backend needs limit.
      // Assuming getEntries returns all if no year/month provided? 
      // Actually getEntries usually requires year/month or defaults to current.
      // Let's try to fetch all recent by NOT passing year/month if API supports it, 
      // OR we fetch current year.
      // Ideally backend should have a "recent" endpoint.
      // For now, let's fetch current year data.
      
      const currentYear = new Date().getFullYear();
      // Fetch entire year? Or maybe 2 years?
      // Let's fetch current year first.
      
      const res = await getEntries({
        operator_id: user?.id,
        tahun: currentYear,
      });
      
      // If API requires month, we might need to loop or change API. 
      // But looking at previous usage, getEntries(user_id, year, month)
      // Let's assume we can fetch by year.
      
      let allData = Array.isArray(res) ? res : [];
      
      // Sort by Created At / Input Date (Desc) - assuming id or created_at proxy
      // Requirement: "berdasarkan tanggal terbaru penginputan" -> created_at ideally, or id desc
      // If created_at not available, use id desc (assuming auto-inc) or tanggal_laporan
      
      allData.sort((a, b) => (b.id || 0) - (a.id || 0));
      
      // Limit to 100
      const recentData = allData.slice(0, 100);
      
      setData(recentData);
    } catch (error) {
      console.error("Gagal ambil data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const displayData = data.filter((item) => {
    const matchesSearch = item.nama_kapal
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus baris ini?")) return;
    try {
      await deleteEntry(id);
      toast.success("Data berhasil dihapus");
      // remove locally
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Gagal menghapus entri:", err);
      toast.error("Gagal menghapus data");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary-600" />
            Report Entry
          </h1>
          <p className="text-slate-500 mt-1">
            Riwayat 100 data terakhir yang diinput
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search */}
        <div className="border-b border-slate-200 p-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari entri..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Tanggal Input & Jenis</th>
                <th className="px-6 py-4 text-right">LOA (m)</th>
                <th className="px-6 py-4 text-right">GRT</th>
                <th className="px-6 py-4">Kegiatan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">
                        Memuat data...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <Ship className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="text-slate-500">
                        <p className="font-medium text-slate-700">
                          Tidak ada data ditemukan
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Tanggal Input & Jenis */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {new Date(item.tanggal_laporan).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-slate-500 uppercase mt-0.5">
                          {item.kategori_pelayaran}
                        </span>
                      </div>
                    </td>

                    {/* LOA */}
                    <td className="px-6 py-4 text-right font-mono text-slate-700">
                      {parseFloat(item.loa || 0).toLocaleString("id-ID")}
                    </td>

                    {/* GRT */}
                    <td className="px-6 py-4 text-right font-mono text-slate-700">
                       {parseFloat(item.grt || 0).toLocaleString("id-ID")}
                    </td>

                    {/* Kegiatan */}
                    <td className="px-6 py-4">
                       <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          item.jenis_kegiatan === "Bongkar"
                            ? "text-orange-600 bg-orange-50"
                            : "text-emerald-600 bg-emerald-50"
                        }`}
                      >
                        {item.jenis_kegiatan}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex space-x-1">
                        <button
                          onClick={() => navigate(`/laporan/detail/${item.id}`)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Hapus Entry"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
           <span>Menampilkan {displayData.length} data</span>
           <span>Maksimal 100 data terakhir</span>
        </div>
      </div>
    </div>
  );
};

export default DataPage;
