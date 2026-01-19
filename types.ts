
export type SystemType = 'HUB' | 'PETSHOP' | 'MATEANDO' | 'CONSULTORIO';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  min_stock: number;
  cost: number;
  margin: number;
  price: number;
  category: 'PETSHOP' | 'MATEANDO';
}

export interface Supplier {
  id: string;
  name: string;
  whatsapp: string;
  category: 'PETSHOP' | 'MATEANDO';
}

export interface Payment {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  date: string;
  time: string;
  type: 'PROVEEDOR' | 'SERVICIO' | 'EMPLEADO' | 'OTRO';
  system_type: 'PETSHOP' | 'MATEANDO';
  payment_method: string;
  recipient_name?: string;
}

export interface Sale {
  id: string;
  created_at: string;
  total: number;
  payment_method: string;
  billing_type: 'FACTURA' | 'COMPROBANTE';
  system_type: 'PETSHOP' | 'MATEANDO';
  sale_items?: SaleItem[];
  is_voided?: boolean;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  name: string;
  quantity: number;
  subtotal: number;
}

export interface Appointment {
  id: string;
  client_name: string;
  pet_name: string;
  date: string;
  time: string;
  type: 'CONSULTA' | 'VACUNA' | 'CIRUGIA' | 'CONTROL';
}
