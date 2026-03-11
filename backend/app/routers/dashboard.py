
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from app.core.database import get_db_connection
from app.core.security import get_current_user

router = APIRouter()

@router.get("/dashboard/monthly")
def get_dashboard_monthly(tahun: int, operator_id: Optional[int] = None):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database tidak terhubung")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Filter by operator if provided
        params = [tahun]
        operator_filter = ""
        if operator_id:
            operator_filter = "AND operator_id = %s"
            params.append(operator_id)

        query = f"""
        SELECT 
            MONTH(tanggal_laporan) as bulan,
            COUNT(*) as total
        FROM ship_entries
        WHERE YEAR(tanggal_laporan) = %s {operator_filter}
        GROUP BY MONTH(tanggal_laporan)
        ORDER BY bulan ASC
        """
        cursor.execute(query, tuple(params))
        data = cursor.fetchall()
        
        # Mapping nama bulan
        months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
        result = []
        
        # Convert list of dicts to dictionary for easier lookup
        data_dict = {item['bulan']: item['total'] for item in data}
        
        # Fill all months
        for i, month_name in enumerate(months):
            result.append({
                "name": month_name,
                "total": data_dict.get(i + 1, 0)
            })
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/dashboard/weekly")
def get_dashboard_weekly(operator_id: Optional[int] = None):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database tidak terhubung")
    
    cursor = conn.cursor(dictionary=True)
    try:
        params = []
        op_filter = ""
        if operator_id:
            op_filter = "AND operator_id = %s"
            params.append(operator_id)
            
        # Ambil 8 minggu terakhir
        query = f"""
        SELECT 
            WEEK(tanggal_laporan) as minggu,
            COUNT(*) as total
        FROM ship_entries
        WHERE tanggal_laporan >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
        {op_filter}
        GROUP BY WEEK(tanggal_laporan)
        ORDER BY minggu ASC
        """
        cursor.execute(query, tuple(params))
        data = cursor.fetchall()
        
        result = [{"name": f"W{item['minggu']}", "total": item['total']} for item in data]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/dashboard/trend")
def get_dashboard_trend(tahun: int, jenis_trend: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database tidak terhubung")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Base Query
        # We need monthly data for each cargo type (jenis_muatan or komoditas)
        # Assuming 'jenis_trend' refers to 'jenis_muatan' or specific logic
        # For simplicity, let's assume it groups by 'nama_muatan' or 'jenis_muatan' based on trend type
        
        # Replicating logic from main.py (simplified as I don't have full logic memorized)
        # If trend is "commodity", we group by komoditas/nama_muatan
        # jenis_trend from frontend sends 'Bongkar' or 'Muat' or 'kategori' or 'jenis_muatan'
        # BUT frontend actually sends 'Bongkar' or 'Muat' as 'type' (mapped to 'jenis_trend' param)
        
        col_name = "nama_muatan" # Default grouping column
        filter_activity = None
        
        # Check if input is Activity Type (Bongkar/Muat)
        if jenis_trend in ['Bongkar', 'Muat']:
            filter_activity = jenis_trend
            # group by komoditas field for cargo breakdown
            col_name = "komoditas"
        elif jenis_trend == 'kategori':
            col_name = "kategori_pelayaran"
        elif jenis_trend == 'jenis_muatan':
            col_name = "jenis_muatan"
            
        sql = f"""
            SELECT 
                COALESCE(NULLIF(komoditas, ''), 'Tanpa Nama') as barang,
                MONTH(tanggal_laporan) as bulan,
                SUM(jumlah_muatan) as volume
            FROM ship_entries
            WHERE YEAR(tanggal_laporan) = %s
              AND status IN ('SUBMITTED', 'APPROVED')
        """
        
        params = [tahun]
        
        if filter_activity:
            sql += " AND jenis_kegiatan = %s"
            params.append(filter_activity)
            
        sql += " GROUP BY barang, MONTH(tanggal_laporan)"
        
        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()
        
        # 2. Extract unique Cargo types (Series)
        unique_cargos = sorted(list(set(r['barang'] for r in rows if r['barang'])))

        # 3. Inisialisasi struktur data Jan-Des
        months_names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                        "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        
        result = []
        for i in range(1, 13):
            month_obj = {
                "name": months_names[i-1],
                "bulan_index": i
            }
            # Initialize all cargos to 0 for this month
            for cargo in unique_cargos:
                month_obj[cargo] = 0

            # Fill with actual data
            month_rows = [r for r in rows if r['bulan'] == i]
            for r in month_rows:
                if r['barang']:
                    month_obj[r['barang']] = float(r['volume'])
            
            result.append(month_obj)
        
        return {
            "series": unique_cargos,
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/summary/tahunan")
def get_summary_tahunan(tahun: int, operator_id: Optional[int] = None):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database tidak terhubung")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Get total unit and LOA for the year per operator
        params = [tahun]
        op_filter = ""
        if operator_id:
            op_filter = "AND operator_id = %s"
            params.append(operator_id)
            
        query = f"""
        SELECT 
            operator_id,
            COUNT(*) as total_unit,
            COALESCE(SUM(loa), 0) as total_loa
        FROM ship_entries
        WHERE YEAR(tanggal_laporan) = %s {op_filter}
        GROUP BY operator_id
        """
        cursor.execute(query, tuple(params))
        data = cursor.fetchall()
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/dashboard/stats")
def get_dashboard_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Hitung Total Hari Ini
        sql = """
            SELECT 
                COUNT(*) as total_unit,
                COALESCE(SUM(loa), 0) as total_loa
            FROM ship_entries
            WHERE DATE(tanggal_laporan) = CURDATE()
        """
        cursor.execute(sql)
        today = cursor.fetchone()
        
        # Hitung Total Keseluruhan
        cursor.execute("SELECT COUNT(*) as all_time FROM ship_entries")
        all_time = cursor.fetchone()
        
        return {
            "today_unit": today['total_unit'],
            "today_loa": today['total_loa'],
            "all_time_unit": all_time['all_time']
        }
    finally:
        cursor.close()
        conn.close()

@router.get("/dashboard/distribution")
def get_commodity_distribution(tahun: int, operator_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database tidak terhubung")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Query for monthly commodity volume
        query = """
        SELECT 
            komoditas AS barang, 
            MONTH(tanggal_laporan) AS bulan,
            SUM(jumlah_muatan) AS volume 
        FROM ship_entries 
        WHERE YEAR(tanggal_laporan) = %s 
        AND operator_id = %s 
        AND status = 'SUBMITTED' 
        GROUP BY komoditas, MONTH(tanggal_laporan)
        ORDER BY bulan ASC
        """
        cursor.execute(query, (tahun, operator_id))
        rows = cursor.fetchall()
        
        # 1. Extract unique Commodity types (Series)
        unique_cargos = sorted(list(set(r['barang'] for r in rows if r['barang'])))

        # 2. Initialize Jan-Dec structure
        months_names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                        "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        
        result = []
        for i in range(1, 13):
            month_obj = {
                "name": months_names[i-1],
                "bulan_index": i
            }
            # Initialize all cargos to 0
            for cargo in unique_cargos:
                month_obj[cargo] = 0

            # Fill with actual data
            month_rows = [r for r in rows if r['bulan'] == i]
            for r in month_rows:
                if r['barang']:
                    month_obj[r['barang']] = float(r['volume'] or 0)
            
            result.append(month_obj)
        
        return {
            "series": unique_cargos,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
