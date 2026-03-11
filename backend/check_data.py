import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="pelabuhan_db"
    )
    cursor = conn.cursor(dictionary=True)
    
    print("--- DATA SHIP ENTRIES ---")
    cursor.execute("SELECT id, jenis_kegiatan, tanggal_laporan, MONTH(tanggal_laporan) as bln FROM ship_entries")
    rows = cursor.fetchall()
    for r in rows:
        print(r)
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
