
export type SystemType = 'HUB' | 'PETSHOP' | 'MATEANDO' | 'CONSULTORIO';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  minStock: number;
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

export interface Sale {
  id: string;
  date: string;
  items: { productId: string; name: string; quantity: number; subtotal: number }[];
  total: number;
  paymentMethod: 'QR' | 'TRANSFERENCIA' | 'CREDITO' | 'DEBITO' | 'EFECTIVO';
  type: 'FACTURA' | 'COMPROBANTE';
  system: 'PETSHOP' | 'MATEANDO';
}

export interface Appointment {
  id: string;
  clientName: string;
  petName: string;
  date: string;
  time: string;
  type: 'CONSULTA' | 'VACUNA' | 'CIRUGIA' | 'CONTROL';
}
