export type UnidadStock = {
  id: string;
  localidad: string;
  nserie: string;
  estado: "Disponible" | "Reservado" | "Vendido" | "En Tránsito";
  fechaIngreso: string;
};

export type Producto = {
  [key: string]: unknown;
  id: string;
  codigoProducto?: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  costoProducto: number | null;
  precioContado: number | null;
  tasaInteresTna: number | null;
  tasaMora: number | null;
  proveedor: string;
  descripcion: string;
  imagenUrl: string;
  imagenUrls?: string[];
  stock?: UnidadStock[];
  activo?: boolean;
  publicado?: boolean;
};
