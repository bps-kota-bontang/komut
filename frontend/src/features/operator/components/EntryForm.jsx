import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Trash2 } from "lucide-react";
import { submitEntries } from "../../../services/api";
const CATEGORIES = [
  { key: "luar_negeri", title: "Luar Negeri" },
  { key: "dalam_negeri", title: "Dalam Negeri" },
  { key: "perintis", title: "Perintis" },
  { key: "rakyat", title: "Rakyat" },
];

const JENIS_KEGIATAN_OPTIONS = ["Bongkar", "Muat"];

const KOMODITAS_OPTIONS = [
  "Ton dan MT",
  "Sirtu, Pasir, Batu",
  "BBM",
  "Mobil",
  "Motor",
  "Truk",
  "Bus",
  "Alat Berat",
  "Container Kosong",
  "Penumpang",
];

const SATUAN_OPTIONS = ["Ton/MT", "M3", "kl", "Unit", "teus", "Orang"];

const JENIS_KEMASAN_OPTIONS = [
  "Curah",
  "Bag",
  "Box",
  "Drum",
  "Peti Kemas",
  "Kandang",
  "Unit",
  "Lainnya",
];

const TableField = ({ children, className = "" }) => (
  <td className={`px-3 py-3 align-top border-t border-slate-200 ${className}`}> {children} </td>
);

TableField.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

// Deprecated ship fields kept for backend compatibility
// Will be removed after database migration
const deprecatedShipFields = {
  nama_kapal: "",
  negara: "",
  kepemilikan: "",
  tiba_pelabuhan: "",
  pelabuhan_tujuan: "",
  tanggal_keberangkatan: "",
  tanggal_kedatangan: "",
  tambat: "",
};

const createEmptyRow = () => ({
  ...deprecatedShipFields,
  loa: 0,
  grt: 0,
  activity: "",
  commodity: "",
  description: "",
  amount: 0,
  unit: "",
  packaging: "",
});

const createInitialEntriesState = () => ({
  luar_negeri: [createEmptyRow()],
  dalam_negeri: [createEmptyRow()],
  perintis: [createEmptyRow()],
  rakyat: [createEmptyRow()],
});

const COMMODITY_UNIT_MAPPING = {
  "Ton dan MT": "Ton/MT",
  "Sirtu, Pasir, Batu": "M3",
  BBM: "kl",
  Mobil: "Unit",
  Motor: "Unit",
  Truk: "Unit",
  Bus: "Unit",
  "Alat Berat": "Unit",
  "Container Kosong": "teus",
  Penumpang: "Orang",
};

const hasRowData = (row) => {
  const loaHasValue = typeof row.loa === "number" && row.loa !== 0;
  const grtHasValue = typeof row.grt === "number" && row.grt !== 0;
  const activityHasValue =
    typeof row.activity === "string" && row.activity.trim() !== "";
  const commodityHasValue =
    typeof row.commodity === "string" && row.commodity.trim() !== "";
  const descriptionHasValue =
    typeof row.description === "string" && row.description.trim() !== "";
  const amountHasValue = typeof row.amount === "number" && row.amount !== 0;
  const unitHasValue = typeof row.unit === "string" && row.unit.trim() !== "";
  const packagingHasValue =
    typeof row.packaging === "string" && row.packaging.trim() !== "";

  return (
    loaHasValue ||
    grtHasValue ||
    activityHasValue ||
    commodityHasValue ||
    descriptionHasValue ||
    amountHasValue ||
    unitHasValue ||
    packagingHasValue
  );
};

const getAmountPlaceholder = (commodity) => {
  if (commodity === "Penumpang") return "Jumlah Penumpang";
  if (commodity === "BBM") return "Volume BBM";
  return "Jumlah / Massa";
};

const formatNumber = (value) => {
  if (!Number.isFinite(value) || value === 0) return "0";
  return value.toLocaleString("id-ID");
};

const EntryCategoryCard = ({
  title,
  rows,
  isDisabled,
  onRowActivate,
  onRowChange,
  onRowDelete,
}) => {
  const tableRef = useRef(null);

  const handleEnterNavigation = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const focusable = Array.from(
      tableRef.current.querySelectorAll(
        "input:not([disabled]), select:not([disabled])"
      )
    );
    const idx = focusable.indexOf(e.target);
    if (idx >= 0) {
      const next = focusable[idx + 1];
      if (next) {
        next.focus();
      } else {
        // at end of table; add a new row if allowed
        const lastRowIndex = rows.length - 1;
        onRowActivate(lastRowIndex);
      }
    }
  };
  const dataRows = rows.filter(hasRowData);

  const totalLoa = dataRows.reduce(
    (acc, r) => acc + (r.loa > 0 ? r.loa : 0),
    0
  );
  const totalGrt = dataRows.reduce(
    (acc, r) => acc + (r.grt > 0 ? r.grt : 0),
    0
  );
  const totalAmount = dataRows.reduce(
    (acc, r) => acc + (r.amount > 0 ? r.amount : 0),
    0
  );

  const descriptionList = dataRows
    .map((r) => (r.description || "").trim())
    .filter(Boolean);
  const descriptionText = descriptionList.length
    ? descriptionList.join(", ")
    : "-";

  const unitSet = new Set(
    dataRows.map((r) => (r.unit || "").trim()).filter(Boolean)
  );
  const unitText = unitSet.size ? Array.from(unitSet).join(", ") : "-";

  return (
    <div className="bg-white p-6 rounded-xl shadow-soft border border-slate-100">
      {/* Cargo Detail Header (Simplified) */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800">
            Detail Muatan ({title})
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full min-w-[1100px] border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
              <th className="px-3 py-3">LOA</th>
              <th className="px-3 py-3">GRT</th>
              <th className="px-3 py-3">Jenis Kegiatan</th>
              <th className="px-3 py-3">Komoditas</th>
              <th className="px-3 py-3">Keterangan Barang</th>
              <th className="px-3 py-3">Jumlah/Massa/Penumpang</th>
              <th className="px-3 py-3">Satuan</th>
              <th className="px-3 py-3">Jenis Kemasan</th>
              <th className="px-3 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <TableField>
                  <input
                    type="number"
                    placeholder="0"
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.loa}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(
                        rowIndex,
                        "loa",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </TableField>
                <TableField>
                  <input
                    type="number"
                    placeholder="0"
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.grt}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(
                        rowIndex,
                        "grt",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </TableField>
                <TableField>
                  <select
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.activity}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(rowIndex, "activity", e.target.value)
                    }
                  >
                    <option value=""></option>
                    {JENIS_KEGIATAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </TableField>
                <TableField>
                  <select
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.commodity}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) => {
                      const nextCommodity = e.target.value;
                      onRowChange(rowIndex, "commodity", nextCommodity);
                      const mappedUnit =
                        COMMODITY_UNIT_MAPPING[nextCommodity] || "";
                      onRowChange(rowIndex, "unit", mappedUnit);
                    }}
                  >
                    <option value=""></option>
                    {KOMODITAS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </TableField>
                <TableField>
                  <input
                    type="text"
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.description}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(rowIndex, "description", e.target.value)
                    }
                  />
                </TableField>
                <TableField>
                  <input
                    type="number"
                    placeholder={getAmountPlaceholder(row.commodity)}
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.amount}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(
                        rowIndex,
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </TableField>
                <TableField>
                  <select
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.unit}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(rowIndex, "unit", e.target.value)
                    }
                  >
                    <option value=""></option>
                    {SATUAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </TableField>
                <TableField>
                  <select
                    className="input-field text-sm h-9"
                    disabled={isDisabled}
                    value={row.packaging}
                    onFocus={() => onRowActivate(rowIndex)}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) =>
                      onRowChange(rowIndex, "packaging", e.target.value)
                    }
                  >
                    <option value=""></option>
                    {JENIS_KEMASAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </TableField>
                <TableField className="text-center">
                  {!isDisabled && (
                    <button
                      type="button"
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Hapus baris"
                      onClick={() => onRowDelete(rowIndex)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </TableField>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Jumlah LOA
            </div>
            <div className="text-lg font-bold text-slate-800">
              {formatNumber(totalLoa)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Jumlah GRT
            </div>
            <div className="text-lg font-bold text-slate-800">
              {formatNumber(totalGrt)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Keterangan Keseluruhan Barang
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-1">
              {descriptionText}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Total Jumlah/Massa/Penumpang
            </div>
            <div className="text-lg font-bold text-slate-800">
              {formatNumber(totalAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Keterangan Keseluruhan Satuan
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-1">
              {unitText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

EntryCategoryCard.propTypes = {
  title: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      loa: PropTypes.number.isRequired,
      grt: PropTypes.number.isRequired,
      activity: PropTypes.string.isRequired,
      commodity: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
      unit: PropTypes.string.isRequired,
      packaging: PropTypes.string.isRequired,
    })
  ).isRequired,
  isDisabled: PropTypes.bool,
  onRowActivate: PropTypes.func.isRequired,
  onRowChange: PropTypes.func.isRequired,
  onRowDelete: PropTypes.func,
};

const EntryForm = (props) => {
  const { isDisabled, entryMonth, entryYear } = props;
  const [entries, setEntries] = useState(createInitialEntriesState);
  const [draftStatus, setDraftStatus] = useState("saved");
  const isFirstRenderRef = useRef(true);
  const skipNextAutosaveRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const updateRowField = (categoryKey, rowIndex, field, value) => {
    setDraftStatus("saving");
    setEntries((prev) => {
      const nextRows = prev[categoryKey].map((row, idx) => {
        if (idx !== rowIndex) return row;
        return { ...row, [field]: value };
      });
      return { ...prev, [categoryKey]: nextRows };
    });
  };

  const handleRowActivate = (categoryKey, rowIndex) => {
    const currentRows = entries[categoryKey];
    const isLastRow = rowIndex === currentRows.length - 1;
    const hasAnyRowData = currentRows.some(hasRowData);
    if (!isLastRow || !hasAnyRowData) return;

    setDraftStatus("saving");
    setEntries((prev) => {
      const prevRows = prev[categoryKey];
      return {
        ...prev,
        [categoryKey]: [...prevRows, createEmptyRow()],
      };
    });
  };

  const handleRowDelete = (categoryKey, rowIndex) => {
    setDraftStatus("saving");
    setEntries((prev) => {
      const newRows = prev[categoryKey].filter((_, idx) => idx !== rowIndex);
      return {
        ...prev,
        [categoryKey]: newRows.length ? newRows : [createEmptyRow()],
      };
    });
  };

  const handleSubmitData = async () => {
    setSubmitError("");

    // Helper to normalize rows and ensure deprecated fields are sent as empty strings
    const normalizeRows = (rows) =>
      rows.filter(hasRowData).map((row) => ({
        ...row,
        nama_kapal: row.nama_kapal || "",
        negara: row.negara || "",
        kepemilikan: row.kepemilikan || "",
        tiba_pelabuhan: row.tiba_pelabuhan || "",
        pelabuhan_tujuan: row.pelabuhan_tujuan || "",
        tanggal_keberangkatan: row.tanggal_keberangkatan || "",
        tanggal_kedatangan: row.tanggal_kedatangan || "",
        tambat: row.tambat || "",
      }));

    const payload = {
      luar_negeri: normalizeRows(entries.luar_negeri),
      dalam_negeri: normalizeRows(entries.dalam_negeri),
      perintis: normalizeRows(entries.perintis),
      rakyat: normalizeRows(entries.rakyat),
      entri_bulan: entryMonth,
      entri_tahun: entryYear,
    };

    try {
      setIsSubmitting(true);
      await submitEntries(payload);
      skipNextAutosaveRef.current = true;
      setEntries(createInitialEntriesState());
      setDraftStatus("saved");
    } catch (err) {
      console.error("Submit failed", err);
      setSubmitError("Gagal mengirim data. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.log("Autosaving draft", entries);
      setDraftStatus("saved");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [entries]);

  return (
    <div className="space-y-8">
      <div className="flex justify-end items-center gap-4">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmitData}
          disabled={isDisabled || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Data"}
        </button>
        <div className="text-xs font-semibold text-slate-500">
          {draftStatus === "saving" ? "Saving draft..." : "Saved ✓"}
        </div>
      </div>
      {submitError && (
        <div className="text-right text-sm font-medium text-red-600">
          {submitError}
        </div>
      )}
      {CATEGORIES.map((c) => (
        <EntryCategoryCard
          key={c.key}
          title={c.title}
          isDisabled={isDisabled}
          rows={entries[c.key]}
          onRowActivate={(rowIndex) => handleRowActivate(c.key, rowIndex)}
          onRowChange={(rowIndex, field, value) =>
            updateRowField(c.key, rowIndex, field, value)
          }
          onRowDelete={(rowIndex) => handleRowDelete(c.key, rowIndex)}
        />
      ))}
    </div>
  );
};

EntryForm.propTypes = {
  isDisabled: PropTypes.bool,
  entryMonth: PropTypes.number,
  entryYear: PropTypes.number,
};

export default EntryForm;
