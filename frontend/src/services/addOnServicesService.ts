import { api } from './api';

export const addOnServicesService = {
  getAddOnServices: (params?: Record<string, unknown>) => api.get('/add-on-services', { params }).then(r => r.data),
  getAddOnServiceById: (id: string) => api.get(`/add-on-services/${id}`).then(r => r.data),
  createAddOnService: (data: Record<string, unknown>) => api.post('/add-on-services', data).then(r => r.data),
  updateAddOnService: (id: string, data: Record<string, unknown>) => api.put(`/add-on-services/${id}`, data).then(r => r.data),
  deleteAddOnService: (id: string) => api.delete(`/add-on-services/${id}`).then(r => r.data),
};
