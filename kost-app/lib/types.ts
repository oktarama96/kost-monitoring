export interface Room {
  id: string;
  room_name: string;
  tenant_name: string;
  base_price: number;
  monthly_fee: number;
  price_per_kwh: number;
}

export interface Bill {
  id: string;
  room_id: string;
  month: number;
  year: number;
  meter_start: number;   // angka meteran bulan lalu (awal periode)
  meter_end: number;     // angka meteran bulan ini (akhir periode)
  kwh_used: number;      // hasil kalkulasi: meter_end - meter_start
  total_amount: number;
  is_paid: boolean;
}

export interface DatabaseData {
  rooms: Room[];
  bills: Bill[];
}

export interface BillWithRoom extends Bill {
  room: Room;
}
