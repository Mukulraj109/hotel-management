import api from './api';

export interface Review {
  _id: string;
  hotelId: {
    _id: string;
    name: string;
  };
  userId: {
    _id: string;
    name: string;
  };
  bookingId?: string;
  rating: number;
  title: string;
  content: string;
  categories: {
    cleanliness: number;
    service: number;
    location: number;
    value: number;
    amenities: number;
  };
  visitType: 'business' | 'leisure' | 'family' | 'couple' | 'solo';
  stayDate?: string;
  images: string[];
  guestName: string;
  isVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  helpfulCount: number;
  reportCount: number;
  response?: {
    content: string;
    respondedBy: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewData {
  hotelId: string;
  bookingId?: string;
  rating: number;
  title: string;
  content: string;
  categories: {
    cleanliness: number;
    service: number;
    location: number;
    value: number;
    amenities: number;
  };
  visitType: 'business' | 'leisure' | 'family' | 'couple' | 'solo';
  stayDate?: string;
  images?: string[];
}

export interface ReviewsResponse {
  status: string;
  results: number;
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
  data: {
    reviews: Review[];
  };
}

export interface ReviewSummary {
  status: string;
  data: {
    summary: {
      totalReviews: number;
      averageRating: number;
      ratingDistribution: {
        [key: string]: number;
      };
      categoryAverages: {
        cleanliness: number;
        service: number;
        location: number;
        value: number;
        amenities: number;
      };
    };
  };
}

class ReviewService {
  async createReview(reviewData: CreateReviewData): Promise<{ status: string; data: { review: Review } }> {
    try {
      const response = await api.post<{ status: string; data: { review: Review } }>('/reviews', reviewData);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to create review'
      );
    }
  }

  async getHotelReviews(
    hotelId: string, 
    params?: {
      page?: number;
      limit?: number;
      sort?: string;
      rating?: number;
      verified?: boolean;
    }
  ): Promise<ReviewsResponse> {
    try {
      const response = await api.get<any>(`/reviews/hotel/${hotelId}`, { params });
      
      // Ensure the response has the expected structure
      const result = {
        status: response.data.status || 'success',
        results: response.data.data?.reviews?.length || 0,
        pagination: {
          current: response.data.data?.pagination?.page || params?.page || 1,
          pages: response.data.data?.pagination?.pages || 1,
          total: response.data.data?.pagination?.total || 0
        },
        data: {
          reviews: response.data.data?.reviews || []
        }
      };
      
      return result;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch hotel reviews'
      );
    }
  }

  async getHotelReviewSummary(hotelId: string): Promise<ReviewSummary> {
    try {
      const response = await api.get<any>(`/reviews/hotel/${hotelId}/summary`);
      
      // Ensure the response has the expected structure
      const result = {
        status: response.data.status || 'success',
        data: {
          summary: response.data.data?.summary || response.data.data || {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            categoryAverages: {
              cleanliness: 0,
              service: 0,
              location: 0,
              value: 0,
              amenities: 0
            }
          }
        }
      };
      
      return result;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch review summary'
      );
    }
  }

  async getReview(reviewId: string): Promise<{ status: string; data: { review: Review } }> {
    try {
      const response = await api.get<{ status: string; data: { review: Review } }>(`/reviews/${reviewId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch review'
      );
    }
  }

  async getUserReviews(params?: {
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<ReviewsResponse> {
    try {
      const response = await api.get<ReviewsResponse>('/reviews/user/my-reviews', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch user reviews'
      );
    }
  }

  async markReviewHelpful(reviewId: string): Promise<{ status: string; message: string }> {
    try {
      const response = await api.post<{ status: string; message: string }>(`/reviews/${reviewId}/helpful`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to mark review as helpful'
      );
    }
  }

  async reportReview(reviewId: string, reason: string): Promise<{ status: string; message: string }> {
    try {
      const response = await api.post<{ status: string; message: string }>(`/reviews/${reviewId}/report`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to report review'
      );
    }
  }

  async addReviewResponse(reviewId: string, content: string): Promise<{ status: string; data: { review: Review } }> {
    try {
      const response = await api.post<{ status: string; data: { review: Review } }>(`/reviews/${reviewId}/response`, { content });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to add review response'
      );
    }
  }
}

export default new ReviewService();