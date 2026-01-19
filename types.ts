
export type SystemType = 'HUB' | 'PETSHOP' | 'MATEANDO' | 'CONSULTORIO' | 'TARIFAS';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  min_stock: number;
  cost: number;
  margin: number;
  price: number;
  category: 'PETSHOP' | 'MATEANDO' | 'CONSULTORIO';
  product_category?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  system_type: 'PETSHOP' | 'MATEANDO' | 'CONSULTORIO';
}

export interface ClinicalConsultation {
  id: string;
  client_name: string;
  pet_name: string;
  weight: string;
  temperature: string;
  reason: string;
  diagnosis: string;
  treatment: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface Payment {
  id: string;
  created_at: string;
  description: string;
  amount: number; 
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'COMPLETO' | 'PENDIENTE';
  date: string;
  time: string;
  type: 'PROVEEDOR' | 'SERVICIO' | 'EMPLEADO' | 'RETIRO' | 'OTRO';
  system_type: 'PETSHOP' | 'MATEANDO' | 'CONSULTORIO';
  payment_method: string;
}

export interface Appointment {
  id: string;
  client_name: string;
  pet_name: string;
  date: string;
  time: string;
  type: 'CONSULTA' | 'VACUNA' | 'CIRUGIA' | 'CONTROL';
}

export interface Tariff {
  id: string;
  category: string; 
  service_name: string; 
  total_price: number;
  groomer_price: number;
}

export interface Sale {
  id: string;
  created_at: string;
  total: number;
  payment_method: string;
  billing_type: 'FACTURA' | 'COMPROBANTE';
  system_type: 'PETSHOP' | 'MATEANDO';
  is_voided: boolean;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  name: string;
  quantity: number;
  subtotal: number;
}
