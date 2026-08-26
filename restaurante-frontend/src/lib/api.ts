import { User, Category, Product, Table, Order, CashRegister, CashClosing } from '@/types';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const API_BASE_URL = configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:5230/api' : null);

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('API não configurada. Defina NEXT_PUBLIC_API_URL na Vercel com a URL do Render.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Users
  getUsers: () => request<User[]>('/users'),
  getUser: (id: number) => request<User>(`/users/${id}`),
  createUser: (data: { username: string; password: string; name: string; role: number; email?: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: { name: string; role: number; email?: string; isActive: boolean }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  getCategory: (id: number) => request<Category>(`/categories/${id}`),
  createCategory: (data: { name: string; description?: string }) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name: string; description?: string }) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: () => request<Product[]>('/products'),
  getProduct: (id: number) => request<Product>(`/products/${id}`),
  getProductsByCategory: (categoryId: number) => request<Product[]>(`/products/category/${categoryId}`),
  getActiveProducts: () => request<Product[]>('/products/active'),
  createProduct: (data: { name: string; description: string; price: number; categoryId: number; imageUrl?: string }) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: { name: string; description: string; price: number; categoryId: number; imageUrl?: string; isActive: boolean }) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),

  // Tables
  getTables: () => request<Table[]>('/tables'),
  getTable: (id: number) => request<Table>(`/tables/${id}`),
  createTable: (data: { number: number; capacity: number; location?: string }) =>
    request<Table>('/tables', { method: 'POST', body: JSON.stringify(data) }),
  updateTable: (id: number, data: { capacity: number; location?: string }) =>
    request<Table>(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTable: (id: number) => request(`/tables/${id}`, { method: 'DELETE' }),
  openTable: (id: number, data: { customerName?: string; observations?: string }) =>
    request<Table>(`/tables/${id}/open`, { method: 'POST', body: JSON.stringify(data) }),
  closeTable: (id: number) =>
    request<Table>(`/tables/${id}/close`, { method: 'POST' }),

  // Orders
  getOrders: () => request<Order[]>('/orders'),
  getOrder: (id: number) => request<Order>(`/orders/${id}`),
  getClosedOrders: (startDate?: string, endDate?: string) =>
    request<Order[]>(`/orders/closed?startDate=${startDate || ''}&endDate=${endDate || ''}`),
  getActiveOrderByTable: (tableId: number) => request<Order>(`/orders/table/${tableId}`),
  createOrder: (data: { tableId: number; customerName?: string; observations?: string }) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  addOrderItem: (orderId: number, data: { productId: number; quantity: number; observations?: string }) =>
    request<Order>(`/orders/${orderId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateOrderItem: (orderId: number, itemId: number, data: { quantity: number; observations?: string }) =>
    request<Order>(`/orders/${orderId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeOrderItem: (orderId: number, itemId: number) =>
    request<Order>(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE' }),
  closeOrder: (id: number, data: { paymentMethod: number; userId: number }) =>
    request<Order>(`/orders/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),

  // Cash Register
  getOpenCashRegister: () => request<CashRegister>('/cashregister/open'),
  openCashRegister: (data: { openingBalance: number }, userId: number) =>
    request<CashRegister>(`/cashregister/open`, { method: 'POST', body: JSON.stringify(data) }),
  closeCashRegister: (data: { closingBalance: number }) =>
    request<CashRegister>('/cashregister/close', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentSummary: () => request<CashClosing>('/cashregister/current-summary'),

  // Cash Closing
  getCashClosings: () => request<CashClosing[]>('/cashclosing'),
  getCashClosing: (id: number) => request<CashClosing>(`/cashclosing/${id}`),
  getCashClosingsByRange: (startDate: string, endDate: string) =>
    request<CashClosing[]>(`/cashclosing/range?startDate=${startDate}&endDate=${endDate}`),
};
