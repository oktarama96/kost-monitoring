export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at?: string;
}

export interface Kost {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  created_at?: string;
}

export interface Room {
  id: string;
  room_name: string;
  kost_id: string;
  base_price: number;
  monthly_fee: number;
  price_per_kwh: number;
}

export interface Tenant {
  id: string;
  room_id: string;
  name: string;
  phone?: string | null;
  check_in_date: string;   // ISO date string
  check_out_date?: string | null; // NULL = masih aktif
  notes?: string | null;
  created_at?: string;
}

export type BillStatus = "paid" | "unpaid" | "expired";

export interface Bill {
  id: string;
  room_id: string;
  month: number;
  year: number;
  meter_start: number;   // angka meteran bulan lalu (awal periode)
  meter_end: number;     // angka meteran bulan ini (akhir periode)
  kwh_used: number;      // hasil kalkulasi: meter_end - meter_start
  total_amount: number;
  status: BillStatus;
  tenant_snapshot_name?: string | null;
}

export interface DatabaseData {
  rooms: Room[];
  bills: Bill[];
}

export interface BillWithRoom extends Bill {
  room: Room;
}

export interface RoomWithActiveTenant extends Room {
  active_tenant?: Tenant | null;
}
