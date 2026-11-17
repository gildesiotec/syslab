import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'patient';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
  photoURL?: string;
}

export interface PatientRecord {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  email: string;
  birthDate?: string;
  userId?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ExamRecord {
  id: string;
  patientId: string;
  examName: string;
  date: Timestamp;
  status: 'pending' | 'available';
  fileUrl?: string; // Keep for backward compatibility
  fileName?: string; // Keep for backward compatibility
  files?: { url: string; name: string }[];
  uploadedBy: string;
  observations?: string;
}

export interface SystemLog {
  id: string;
  action: string;
  userId: string;
  timestamp: Timestamp;
  details?: string;
}
