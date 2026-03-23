export interface Employee {
  id: string;
  name: string;
  position: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  status: 'present' | 'absent' | 'late';
}

export interface ProductionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  productName: string;
  quantity: number;
  unit: string;
  notes?: string;
}
