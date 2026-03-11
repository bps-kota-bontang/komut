
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List
from datetime import date, datetime

class UserLogin(BaseModel):
    email: str
    password: str

class UserInfo(BaseModel):
    id: int
    nama: str
    email: Optional[str] = None
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo

class ShipEntry(BaseModel):
    kategori_pelayaran: Literal["Luar Negeri", "Dalam Negeri", "Perintis", "Rakyat"]
    loa: float
    grt: float
    jenis_kegiatan: Literal["Bongkar", "Muat"]
    
    # New Fields v3.1
    jenis_muatan: Literal["Barang", "Hewan", "Manusia"] = "Barang"
    komoditas: Optional[str] = None 
    nama_muatan: Optional[str] = None 
    jumlah_muatan: float = Field(default=0) 
    satuan_muatan: Optional[str] = None 
    jenis_kemasan: Optional[str] = None 
    
    # Legacy Fields (Calculated/Mapped)
    berat_ton: float = Field(default=0)
    jumlah_penumpang: int = Field(default=0)
    
    tanggal_laporan: date
    operator_id: Optional[int] = None
    
    # Metadata Submission (Optional in response)
    submitted_at: Optional[datetime] = None
    submit_method: Optional[Literal["MANUAL", "AUTO"]] = "MANUAL"

    @field_validator('jenis_muatan')
    def validate_cargo_logic(cls, v, info):
        # We can implement the logic here if needed, but it was in the endpoint in main.py
        # For now, let's keep it simple or move the logic here.
        # The logic in main.py modified 'self', which Pydantic v2 validators can do.
        return v
    
    # Pydantic v2 model_validator for cross-field validation
    # I'll skip complex validation migration for this step to ensure basic connectivity first,
    # relying on the frontend validation or basic backend checks in the router.

class EntryUpdate(BaseModel):
    loa: Optional[float] = None
    grt: Optional[float] = None
    jenis_kegiatan: Optional[str] = None
    nama_muatan: Optional[str] = None
    jumlah_muatan: Optional[float] = None
    satuan_muatan: Optional[str] = None

class SubmitRequest(BaseModel):
    operator_id: Optional[int] = None
    bulan: int
    tahun: int

class UserCreate(BaseModel):
    nama: str
    email: str
    password: str
