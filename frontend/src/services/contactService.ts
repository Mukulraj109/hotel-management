import api from './api';

export interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  status: string;
  message: string;
  data: {
    id: string;
  };
}

class ContactService {
  async submitContactForm(formData: ContactForm): Promise<ContactResponse> {
    try {
      const response = await api.post<ContactResponse>('/contact', formData);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to submit contact form'
      );
    }
  }
}

export default new ContactService();