import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEntryDetail } from "../../../services/api";
import {
  ArrowLeft,
  Printer,
  FileText,
  Calendar,
  MapPin,
  Anchor,
  Box,
  User,
  Flag,
  Navigation,
  Ship, // Import Ship
} from "lucide-react";
import toast from "react-hot-toast";

const DetailReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getEntryDetail(id);
        setData(res);
      } catch (err) {
        console.error("Failed to fetch detail:", err);
        toast.error("Gagal memuat detail laporan");
        navigate("/laporan");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetail();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white relative">
      {/* Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        <div className="text-slate-200 text-[15rem] font-black opacity-20 -rotate-45 select-none transform scale-150 whitespace-nowrap">
          READ ONLY
        </div>
      </div>

      {/* Toolbar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden relative z-10">
        <button
          onClick={() => navigate("/laporan")}
          className="flex items-center text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Kembali
        </button>
        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center">
          <FileText size={16} className="mr-2" />
          Mode Baca Saja (Read-Only)
        </div>
      </div>

      {/* Paper Sheet */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none min-h-[1123px] relative z-10 print:w-full print:max-w-none">
        {/* Header - Matches PDF Template Style (BPS KOTA BONTANG) */}
        <div className="border-b-4 border-black p-8 pb-4">
          <div className="flex items-center gap-6">
            {/* Logo BPS */}
            <div className="w-24 h-16 relative">
              {/* Using external logo for demo, ideally local asset */}
              <img
                src="/logo-bps.png"
                alt="Logo BPS"
                className="w-full h-full object-contain object-left"
              />
            </div>
            {/* Text Header */}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-black uppercase leading-tight tracking-tight">
                BADAN PUSAT STATISTIK
                <br />
                KOTA BONTANG
              </h1>
              <div className="text-[10px] text-black font-medium leading-snug mt-1">
                Jl. Awang Long No 2, Bontang Baru, Kec. Bontang Utara, Kota
                Bontang
                <br />
                Telp (0548) 26066 Homepage: https://bontangkota.bps.go.id/
                E-mail: bps6474@bps.go.id
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-10 space-y-10">
          {/* Section 1: Detail Muatan */}
          <section>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2 flex items-center gap-2">
              <Box size={16} /> Detail Muatan
            </h2>
            <div className="grid grid-cols-3 gap-6 bg-slate-800 text-white p-6 rounded-xl shadow-lg">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Jenis Kegiatan
                </label>
                <div
                  className={`text-lg font-black uppercase tracking-wide ${
                    data.jenis_kegiatan === "Bongkar"
                      ? "text-orange-400"
                      : "text-emerald-400"
                  }`}
                >
                  {data.jenis_kegiatan}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Komoditas
                </label>
                <div className="text-lg font-bold">
                  {data.komoditas || data.nama_muatan}
                </div>
                {data.komoditas && data.nama_muatan && (
                  <div className="text-xs text-slate-400 italic mt-1">
                    ({data.nama_muatan})
                  </div>
                )}
              </div>
              <div className="text-right">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Volume / Jumlah
                </label>
                <div className="text-3xl font-mono font-bold">
                  {parseFloat(data.jumlah_muatan).toLocaleString("id-ID")}
                </div>
                <div className="text-sm font-medium text-slate-400 mt-1">
                  {data.satuan_muatan}
                  {data.jenis_kemasan &&
                    data.jenis_kemasan !== "-" &&
                    ` • ${data.jenis_kemasan}`}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Informasi Tambahan */}
          <section>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2 flex items-center gap-2">
              <FileText size={16} /> Informasi Tambahan
            </h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    LOA (Meter)
                  </label>
                  <div className="text-base font-mono font-bold text-slate-800">
                    {parseFloat(data.loa).toLocaleString("id-ID")}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    GRT
                  </label>
                  <div className="text-base font-mono font-bold text-slate-800">
                    {parseFloat(data.grt).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Tanggal Laporan
                </label>
                <div className="text-base font-medium text-slate-700 flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  {data.tanggal_laporan
                    ? new Date(data.tanggal_laporan).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "-"}
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Metadata */}
          <section className="pt-8 border-t border-slate-200">
            <div className="flex justify-between items-end">
              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  Operator:{" "}
                  <span className="font-bold text-slate-600">
                    {data.operator_name}
                  </span>
                </p>
                <p>
                  Kategori:{" "}
                  <span className="font-bold text-slate-600">
                    {data.kategori_pelayaran}
                  </span>
                </p>
                <p>
                  Status:{" "}
                  <span className="font-bold text-slate-600 uppercase">
                    {data.status}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <div className="w-24 h-24 border-2 border-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 font-bold uppercase text-center leading-tight">
                    Digital
                    <br />
                    Signature
                    <br />
                    Placeholder
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  Generated by Simoppel System
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Stripe */}
        <div className="h-4 bg-slate-800 w-full absolute bottom-0"></div>
      </div>
    </div>
  );
};

export default DetailReportPage;
