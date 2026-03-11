import { useState } from "react";
import PropTypes from "prop-types";
import {
  Edit,
  Eye,
  Ship,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const EntryTable = ({ data, onEdit, onDelete, isDisabled }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Pagination Logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${
        isDisabled ? "opacity-90" : ""
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold w-[150px]">
                ID Laporan & Tanggal
              </th>
              <th className="px-6 py-4 font-semibold text-center w-[100px]">
                LOA (m)
              </th>
              <th className="px-6 py-4 font-semibold text-center w-[100px]">
                GRT
              </th>
              <th className="px-6 py-4 font-semibold text-center w-[120px]">
                Kegiatan
              </th>
              <th className="px-6 py-4 font-semibold w-[180px]">
                Detail Muatan
              </th>
              <th className="px-6 py-4 font-semibold text-right w-[100px]">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-slate-50 rounded-full">
                      <Ship size={32} className="text-slate-300" />
                    </div>
                    <p className="font-medium">
                      Belum ada data entri untuk periode ini
                    </p>
                    {!isDisabled && (
                      <p className="text-xs text-slate-400">
                        Silakan isi formulir di atas untuk menambahkan data baru
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isDisabled ? "hover:bg-transparent" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-800 text-sm">
                        Report #{item.id}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Lapor: {formatDate(item.tanggal_laporan)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center align-top">{item.loa}</td>
                  <td className="px-6 py-4 text-center align-top">{item.grt}</td>
                  <td className="px-6 py-4 text-center align-top">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.jenis_kegiatan === "Bongkar"
                          ? "text-orange-600 bg-orange-50"
                          : "text-emerald-600 bg-emerald-50"
                      }`}
                    >
                      {item.jenis_kegiatan}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm align-top">
                    {/* Display Komoditas Logic */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {item.komoditas || item.nama_muatan}
                        </span>
                        {item.komoditas && item.nama_muatan && (
                          <span className="text-xs text-slate-500 italic">
                            ({item.nama_muatan})
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-600 mt-0.5">
                        {item.jumlah_muatan?.toLocaleString()}{" "}
                        <span className="font-semibold text-slate-700">
                          {item.satuan_muatan}
                        </span>
                        {item.jenis_kemasan && item.jenis_kemasan !== "-" && (
                          <span className="text-slate-400 ml-1">
                            • {item.jenis_kemasan}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => onEdit(item)}
                        disabled={isDisabled}
                        className={`p-2 rounded-lg transition ${
                          isDisabled
                            ? "text-slate-300 cursor-not-allowed"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                        title={isDisabled ? "View Details" : "Edit Data"}
                      >
                        <Edit size={18} />
                      </button>

                      {!isDisabled && (
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                          title="Hapus Data"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>
          Menampilkan {indexOfFirstItem + 1} -{" "}
          {Math.min(indexOfLastItem, data.length)} dari {data.length} data
        </span>
        <div className="flex space-x-2">
          <button
            onClick={goToPrevPage}
            className="flex items-center px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={currentPage === 1}
          >
            <ChevronLeft size={14} className="mr-1" /> Previous
          </button>
          <div className="flex items-center px-4 font-medium text-slate-700">
            Halaman {currentPage} dari {totalPages || 1}
          </div>
          <button
            onClick={goToNextPage}
            className="flex items-center px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next <ChevronRight size={14} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

EntryTable.propTypes = {
  data: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  isDisabled: PropTypes.bool,
};

export default EntryTable;
