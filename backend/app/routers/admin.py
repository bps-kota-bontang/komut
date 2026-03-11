
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from datetime import date, timedelta, datetime
from app.core.database import get_db_connection
from app.core.security import get_current_user, get_password_hash
from app.services.seeder import seed_sample_data
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/admin/auto-submit-logs")
def get_auto_submit_logs(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    filter: Optional[str] = None, # '7_days', '30_days', 'all'
    sort: Optional[str] = 'newest',
    user: dict = Depends(get_current_user)
):
    if user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        offset = (page - 1) * limit
        
        # Base Query: Select individual entries
        base_query = """
            SELECT 
                se.id,
                se.submitted_at,
                se.tanggal_laporan,
                se.operator_id,
                u.nama as operator_name,
                se.loa,
                se.jenis_kegiatan
            FROM ship_entries se
            JOIN users u ON se.operator_id = u.id
            WHERE se.status IN ('SUBMITTED', 'APPROVED')
              AND se.submitted_at IS NOT NULL
        """
        
        params = []
        
        # Apply Search (Operator Name)
        if search:
            base_query += " AND u.nama LIKE %s"
            params.append(f"%{search}%")
            
        # Apply Time Filter (Based on Tanggal Laporan)
        if filter == '7_days':
            base_query += " AND se.tanggal_laporan >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        elif filter == '30_days':
            base_query += " AND se.tanggal_laporan >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        elif filter == 'today':
             base_query += " AND DATE(se.tanggal_laporan) = CURDATE()"
        
        # Count Total Data (for pagination) - BEFORE ORDER/LIMIT
        count_sql = f"SELECT COUNT(*) as total FROM ({base_query}) as sub"
        cursor.execute(count_sql, tuple(params))
        total_rows = cursor.fetchone()['total']
        total_pages = (total_rows + limit - 1) // limit
        
        # Sorting (Newest Report Date First)
        if sort == 'oldest':
            base_query += " ORDER BY se.tanggal_laporan ASC, se.submitted_at ASC"
        else:
            base_query += " ORDER BY se.tanggal_laporan DESC, se.submitted_at DESC"
            
        # Pagination
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(base_query, tuple(params))
        data = cursor.fetchall()
        
        # Format date for frontend
        for row in data:
            # Prioritize 'tanggal_laporan' for display date
            if row['tanggal_laporan']:
                row['date'] = row['tanggal_laporan'].strftime('%Y-%m-%d')
            elif row['submitted_at']:
                # Fallback if no report date (though required in DB)
                row['date'] = row['submitted_at'].strftime('%Y-%m-%d')
                
            if row['submitted_at']:
                # Keep full timestamp for detail/audit
                row['timestamp'] = row['submitted_at'].strftime('%Y-%m-%d %H:%M:%S')
                
        return {
            "data": data,
            "total": total_rows,
            "total_pages": total_pages,
            "current_page": page
        }
        
    finally:
        cursor.close()
        conn.close()

@router.post("/admin/seed-sample")
def api_seed_sample(
    user: dict = Depends(get_current_user),
    days: int = 90,
    min_entries: int = 10,
    max_entries: int = 15,
    reset_existing: bool = False
):
    if user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Unauthorized")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database tidak terhubung")
    try:
        end = date.today()
        start = end - timedelta(days=days)
        seed_sample_data(
            conn,
            num_operators=5,
            start_date=start,
            end_date=end,
            entries_per_operator_min=min_entries,
            entries_per_operator_max=max_entries,
            reset_existing=reset_existing,
            get_password_hash_func=get_password_hash
        )
        return {"message": "Seed sample berhasil dijalankan"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/admin/rekap-entries")
def get_rekap_entries(
    category: str, 
    start_date: str, 
    end_date: str, 
    user: dict = Depends(get_current_user)
):
    if user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database error")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get Header Stats (Unit, GRT, LOA)
        # Modified: Use tanggal_laporan instead of tanggal_kedatangan
        
        header_sql = """
            SELECT 
                COUNT(*) as unit,
                COALESCE(SUM(grt), 0) as total_grt,
                COALESCE(SUM(loa), 0) as total_loa
            FROM ship_entries
            WHERE kategori_pelayaran = %s 
              AND tanggal_laporan BETWEEN %s AND %s
              AND status IN ('SUBMITTED', 'APPROVED')
        """
        cursor.execute(header_sql, (category, start_date, end_date))
        header = cursor.fetchone()

        # 2. Get Cargo Breakdown (Bongkar / Inbound) - EXCLUDE Passengers & Containers
        # Modified: Use tanggal_laporan instead of tanggal_kedatangan
        # Modified: Group by 'satuan_muatan' to aggregate "TON dan MT" correctly
        # Note: 'komoditas' column does not exist in DB, so we rely on 'satuan_muatan' mapping
        bongkar_sql = """
            SELECT 
                COALESCE(NULLIF(nama_muatan, ''), komoditas, 'Tanpa Nama') as barang,
                satuan_muatan as satuan,
                SUM(jumlah_muatan) as volume
            FROM ship_entries
            WHERE kategori_pelayaran = %s 
              AND tanggal_laporan BETWEEN %s AND %s
              AND jenis_kegiatan = 'Bongkar'
              AND status IN ('SUBMITTED', 'APPROVED')
              AND jenis_muatan = 'Barang'
            GROUP BY barang, satuan_muatan
        """
        cursor.execute(bongkar_sql, (category, start_date, end_date))
        bongkar_rows = cursor.fetchall()
        
        bongkar_data = {}
        # Special aggregation for PDF which expects "TON dan MT" key
        ton_mt_total = 0
        
        for r in bongkar_rows:
            # Add detailed item (for Screen)
            if r['barang']:
                if r['barang'] not in bongkar_data:
                    bongkar_data[r['barang']] = {"value": 0, "satuan": r['satuan']}
                bongkar_data[r['barang']]['value'] += float(r['volume'])
            
            # Aggregate for PDF "TON dan MT"
            if r['satuan'] in ['Ton', 'MT', 'Ton/MT']:
                ton_mt_total += float(r['volume'])
        
        # Add the aggregated key for PDF
        if ton_mt_total > 0:
            bongkar_data["TON dan MT"] = {"value": ton_mt_total, "satuan": "Ton/MT"}

        # 3. Get Cargo Breakdown (Muat / Outbound) - EXCLUDE Passengers & Containers
        muat_sql = """
            SELECT 
                COALESCE(NULLIF(nama_muatan, ''), komoditas, 'Tanpa Nama') as barang,
                satuan_muatan as satuan,
                SUM(jumlah_muatan) as volume
            FROM ship_entries
            WHERE kategori_pelayaran = %s 
              AND tanggal_laporan BETWEEN %s AND %s
              AND jenis_kegiatan = 'Muat'
              AND status IN ('SUBMITTED', 'APPROVED')
              AND jenis_muatan = 'Barang'
            GROUP BY barang, satuan_muatan
        """
        cursor.execute(muat_sql, (category, start_date, end_date))
        muat_rows = cursor.fetchall()
        
        muat_data = {}
        muat_ton_mt_total = 0
        
        for r in muat_rows:
            if r['barang']:
                if r['barang'] not in muat_data:
                    muat_data[r['barang']] = {"value": 0, "satuan": r['satuan']}
                muat_data[r['barang']]['value'] += float(r['volume'])
            
            if r['satuan'] in ['Ton', 'MT', 'Ton/MT']:
                muat_ton_mt_total += float(r['volume'])
                
        if muat_ton_mt_total > 0:
            muat_data["TON dan MT"] = {"value": muat_ton_mt_total, "satuan": "Ton/MT"}

        # 4. Get Passenger Stats (Penumpang)
        penumpang_sql = """
            SELECT 
                jenis_kegiatan,
                SUM(jumlah_muatan) as total_pax
            FROM ship_entries
            WHERE kategori_pelayaran = %s 
              AND tanggal_laporan BETWEEN %s AND %s
              AND jenis_muatan = 'Manusia'
              AND status IN ('SUBMITTED', 'APPROVED')
            GROUP BY jenis_kegiatan
        """
        cursor.execute(penumpang_sql, (category, start_date, end_date))
        pax_rows = cursor.fetchall()
        
        penumpang_data = {"turun": 0, "naik": 0}
        for r in pax_rows:
            # Add to bongkar/muat data so frontend finds it at getVal("bongkar", "Penumpang")
            key = "Penumpang"
            val = float(r['total_pax'])
            if r['jenis_kegiatan'] == 'Bongkar':
                penumpang_data['turun'] = val
                bongkar_data[key] = {"value": val, "satuan": "Orang"}
            elif r['jenis_kegiatan'] == 'Muat':
                penumpang_data['naik'] = val
                muat_data[key] = {"value": val, "satuan": "Orang"}

        # 5. Get Container Stats
        # Logic: 
        # - Map 'satuan_muatan' = 'Teus' to 20ft Box (approximation)
        # - Check 'nama_muatan' for 'kosong' status (fallback as komoditas/container_status missing)
        # - Future proof: also sum teus_20_box / teus_40_box if available
        container_sql = """
            SELECT 
                jenis_kegiatan,
                nama_muatan,
                SUM(jumlah_muatan) as total_teus,
                SUM(teus_20_box) as t20,
                SUM(teus_40_box) as t40
            FROM ship_entries
            WHERE kategori_pelayaran = %s 
              AND tanggal_laporan BETWEEN %s AND %s
              AND (satuan_muatan = 'Teus' OR teus_20_box > 0 OR teus_40_box > 0)
              AND status IN ('SUBMITTED', 'APPROVED')
            GROUP BY jenis_kegiatan, nama_muatan
        """
        cursor.execute(container_sql, (category, start_date, end_date))
        cont_rows = cursor.fetchall()
        
        # Structure: container_stats[Type][Status][Size]
        # Type: Bongkar/Muat (Capitalized)
        # Status: Isi/Kosong (Capitalized)
        # Size: 20_box, 40_box, 20_ton, 40_ton
        container_stats = {
            "Bongkar": {
                "Isi": {"20_box": 0, "40_box": 0, "20_ton": 0, "40_ton": 0},
                "Kosong": {"20_box": 0, "40_box": 0}
            },
            "Muat": {
                "Isi": {"20_box": 0, "40_box": 0, "20_ton": 0, "40_ton": 0},
                "Kosong": {"20_box": 0, "40_box": 0}
            }
        }
        
        for r in cont_rows:
            kegiatan = r['jenis_kegiatan'] # "Bongkar" / "Muat"
            # Fallback logic for status since komoditas is missing in DB
            nama_muatan = (r['nama_muatan'] or "").lower()
            
            # Determine Status (Isi/Kosong)
            status = "Isi"
            if "kosong" in nama_muatan:
                status = "Kosong"
            
            # Determine Counts
            t20 = float(r['t20'] or 0)
            t40 = float(r['t40'] or 0)
            
            # If explicit columns are 0, fallback to jumlah_muatan (assumed 20ft TEU)
            if t20 == 0 and t40 == 0:
                t20 = float(r['total_teus'] or 0)
            
            if kegiatan in container_stats and status in container_stats[kegiatan]:
                container_stats[kegiatan][status]["20_box"] += t20
                container_stats[kegiatan][status]["40_box"] += t40
                
                # Note: Tonnage logic is complex without explicit weight per container
                # Leaving Tonnage 0 for now as requested.
        
        return {
            "header": {
                "unit": header['unit'],
                "total_grt": float(header['total_grt']),
                "total_loa": float(header['total_loa'])
            },
            "bongkar": bongkar_data,
            "muat": muat_data,
            "penumpang": penumpang_data,
            "container_stats": container_stats
        }
        
    finally:
        cursor.close()
        conn.close()

@router.get("/admin/rekap-entries/all")
def get_all_rekap_entries(
    start_date: str, 
    end_date: str, 
    user: dict = Depends(get_current_user)
):
    if user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database error")
    
    cursor = conn.cursor(dictionary=True)
    try:
        categories = ["Luar Negeri", "Dalam Negeri", "Perintis", "Rakyat"]
        
        # Initialize result structure
        result = {cat: {
            "header": {"unit": 0, "total_grt": 0, "total_loa": 0},
            "bongkar": {},
            "muat": {},
            "penumpang": {"turun": 0, "naik": 0},
            "container_stats": {
                "Bongkar": {
                    "Isi": {"20_box": 0, "40_box": 0, "20_ton": 0, "40_ton": 0},
                    "Kosong": {"20_box": 0, "40_box": 0, "20_ton": 0, "40_ton": 0}
                },
                "Muat": {
                    "Isi": {"20_box": 0, "40_box": 0, "20_ton": 0, "40_ton": 0},
                    "Kosong": {"20_box": 0, "40_box": 0, "20_ton": 0, "40_ton": 0}
                }
            }
        } for cat in categories}

        # Conversion Factors (Estimations)
        # Used when explicit weight (berat_ton) is missing
        CONV = {
            "sirtu": 1.5, "pasir": 1.5, "batu": 1.5, # M3 -> Ton
            "bbm": 0.85, # KL -> Ton
            "motor": 0.15, "mobil": 1.2, "truk": 6.0, "bus": 10.0, "alat berat": 15.0 # Unit -> Ton
        }

        # Fetch ALL detailed rows for processing
        # This allows complex logic that is hard to do in SQL
        # Note: 'komoditas' column does not exist in DB, using 'nama_muatan' as primary desc
        sql = """
            SELECT 
                kategori_pelayaran,
                jenis_kegiatan,
                jenis_muatan,
                nama_muatan,
                komoditas,
                jumlah_muatan,
                satuan_muatan,
                berat_ton,
                teus_20_box,
                teus_40_box,
                container_status,
                grt,
                loa
            FROM ship_entries
            WHERE tanggal_laporan BETWEEN %s AND %s
              AND status IN ('SUBMITTED', 'APPROVED')
        """
        cursor.execute(sql, (start_date, end_date))
        rows = cursor.fetchall()
        
        for r in rows:
            cat = r['kategori_pelayaran']
            if cat not in result:
                continue
                
            kegiatan = r['jenis_kegiatan'] # Bongkar / Muat
            j_muatan = r['jenis_muatan'] # Barang / Hewan / Manusia
            
            # 1. Header Stats
            result[cat]['header']['unit'] += 1
            result[cat]['header']['total_grt'] += float(r['grt'] or 0)
            result[cat]['header']['total_loa'] += float(r['loa'] or 0)
            
            # 2. Penumpang
            if j_muatan == 'Manusia':
                if kegiatan == 'Bongkar':
                    result[cat]['penumpang']['turun'] += float(r['jumlah_muatan'] or 0)
                    # Add to breakdown for PDF list
                    if "Penumpang" not in result[cat]['bongkar']:
                        result[cat]['bongkar']["Penumpang"] = {"value": 0, "satuan": "Orang"}
                    result[cat]['bongkar']["Penumpang"]["value"] += float(r['jumlah_muatan'] or 0)
                elif kegiatan == 'Muat':
                    result[cat]['penumpang']['naik'] += float(r['jumlah_muatan'] or 0)
                    if "Penumpang" not in result[cat]['muat']:
                        result[cat]['muat']["Penumpang"] = {"value": 0, "satuan": "Orang"}
                    result[cat]['muat']["Penumpang"]["value"] += float(r['jumlah_muatan'] or 0)
                continue

            # 3. Containers
            is_container = False
            # Fallback since komoditas column missing
            komoditas = (r['nama_muatan'] or "").lower() 
            satuan = (r['satuan_muatan'] or "").lower()
            nama_muatan = (r['nama_muatan'] or "").lower()
            
            if "container" in komoditas or "peti kemas" in komoditas or "teus" in satuan or (r['teus_20_box'] or 0) > 0:
                is_container = True
                
                # Determine Status (Isi/Kosong)
                status = "Isi"
                # Check DB column first, then text fallback
                if r['container_status'] == 'Kosong' or "kosong" in komoditas or "kosong" in nama_muatan:
                    status = "Kosong"
                
                # Box Count
                t20 = float(r['teus_20_box'] or 0)
                t40 = float(r['teus_40_box'] or 0)
                
                # Fallback if specific columns empty but generic count exists
                if t20 == 0 and t40 == 0:
                    # Assume 20ft if unspecified
                    t20 = float(r['jumlah_muatan'] or 0)
                
                # Tonnage
                weight = float(r['berat_ton'] or 0)
                
                # Update Container Stats
                if kegiatan in result[cat]['container_stats']:
                    if status not in result[cat]['container_stats'][kegiatan]:
                         # Fallback if status is weird, though it shouldn't be
                         status = "Isi"
                         
                    stats = result[cat]['container_stats'][kegiatan][status]
                    try:
                        stats["20_box"] += t20
                        stats["40_box"] += t40
                        
                        total_box = t20 + t40
                        if total_box > 0:
                            if "20_ton" not in stats:
                                stats["20_ton"] = 0
                            if "40_ton" not in stats:
                                stats["40_ton"] = 0
                                
                            stats["20_ton"] += weight * (t20 / total_box)
                            stats["40_ton"] += weight * (t40 / total_box)
                    except KeyError as e:
                        logger.error(f"Error updating container stats: {e}")
                        # Continue to avoid crashing

                
                # continue # Done with container - Commented out to allow adding to main list

            # 4. Barang / Perdagangan (Non-Container, Non-Pax)
            if j_muatan == 'Barang':
                volume = float(r['jumlah_muatan'] or 0)
                weight_ton = float(r['berat_ton'] or 0)
                
                # Logic: Convert to Ton
                final_ton = 0
                
                if weight_ton > 0:
                    final_ton = weight_ton
                else:
                    # Try conversion
                    if "ton" in satuan or "mt" in satuan:
                        final_ton = volume
                    elif "m3" in satuan:
                        # Check komoditas for specific density
                        factor = 1.0 # Default fallback
                        for k, v in CONV.items():
                            if k in komoditas or k in nama_muatan:
                                factor = v
                                break
                        final_ton = volume * factor
                    elif "kl" in satuan:
                        final_ton = volume * CONV['bbm']
                    elif "unit" in satuan:
                        factor = 0 # Default ignore if unknown unit
                        for k, v in CONV.items():
                            if k in komoditas or k in nama_muatan:
                                factor = v
                                break
                        final_ton = volume * factor
                
                # Add to "TON dan MT" aggregate
                target_dict = result[cat]['bongkar'] if kegiatan == 'Bongkar' else result[cat]['muat']
                
                if "TON dan MT" not in target_dict:
                    target_dict["TON dan MT"] = {"value": 0, "satuan": "Ton/MT"}
                
                target_dict["TON dan MT"]["value"] += final_ton
                
                # Also add detailed item for list
                # Fix: Handle empty nama_muatan/komoditas properly to avoid "Unknown"
                item_name = r['nama_muatan'] or r['komoditas'] or "Tanpa Nama"
                
                if item_name not in target_dict:
                    target_dict[item_name] = {"value": 0, "satuan": r['satuan_muatan']}
                target_dict[item_name]["value"] += volume

        return result
        
    finally:
        cursor.close()
        conn.close()

@router.get("/admin/dashboard-summary")
def get_admin_dashboard_summary(
    bulan: int, 
    tahun: int, 
    trend_type: str = 'Bongkar',
    user: dict = Depends(get_current_user)
):
    if user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database error")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Global Stats (Filtered by Month & Year ONLY)
        # Simplified: Show TOTAL for all activities regardless of trend_type filter
        global_sql = """
            SELECT 
                COUNT(*) as total_unit
            FROM ship_entries 
            WHERE MONTH(tanggal_laporan) = %s
              AND YEAR(tanggal_laporan) = %s
              AND status IN ('SUBMITTED', 'APPROVED')
        """
        cursor.execute(global_sql, (bulan, tahun))
        global_stats = cursor.fetchone()

        # 2. Total Submitted (Laporan Masuk)
        # Simplified: Show TOTAL submitted regardless of activity type
        submitted_sql = """
            SELECT COUNT(*) as total_submitted
            FROM ship_entries 
            WHERE MONTH(tanggal_laporan) = %s
              AND YEAR(tanggal_laporan) = %s
              AND status IN ('SUBMITTED', 'APPROVED')
        """
        cursor.execute(submitted_sql, (bulan, tahun))
        submitted_stats = cursor.fetchone()
            
        return {
            "summary": {
                "totalUnitGlobal": global_stats['total_unit'],
                "totalSubmitted": submitted_stats['total_submitted']
            }
        }
        
    finally:
        cursor.close()
        conn.close()
