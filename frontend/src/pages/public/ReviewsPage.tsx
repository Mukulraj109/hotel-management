import React, { useState, useEffect } from 'react';
import { Star, Filter, ThumbsUp, Flag, Calendar, User, Award, TrendingUp } from 'lucide-react';
import reviewService, { Review, ReviewSummary } from '../../services/reviewService';
import { Button } from '../../components/ui/Button';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary['data']['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    rating: 0,
    verified: false,
    sort: '-createdAt'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null); // Will be set dynamically

  useEffect(() => {
    fetchAvailableHotel();
  }, []);

  useEffect(() => {
    if (selectedHotel) {
      loadReviews();
      loadReviewSummary();
    }
  }, [filters, currentPage, selectedHotel]);

  const fetchAvailableHotel = async () => {
    try {
      // Get the actual hotel ID from the seeded data
      // Let's fetch the first hotel from the rooms API to get a real hotel ID
      const response = await fetch('http://localhost:4000/api/v1/rooms');
      const roomsData = await response.json();
      
      if (roomsData.data?.rooms?.[0]?.hotelId?._id) {
        const realHotelId = roomsData.data.rooms[0].hotelId._id;
        console.log('Using real hotel ID:', realHotelId);
        setSelectedHotel(realHotelId);
      } else {
        // Fallback to a standard ObjectId if no rooms found
        const fallbackId = '507f1f77bcf86cd799439011';
        console.log('Using fallback hotel ID:', fallbackId);
        setSelectedHotel(fallbackId);
      }
    } catch (error) {
      console.error('Failed to fetch hotel:', error);
      // Use fallback ID
      const fallbackId = '507f1f77bcf86cd799439011';
      console.log('Error occurred, using fallback hotel ID:', fallbackId);
      setSelectedHotel(fallbackId);
    }
  };

  const loadReviews = async () => {
    if (!selectedHotel) return;
    
    try {
      setLoading(true);
      console.log('Loading reviews for hotel:', selectedHotel);
      const response = await reviewService.getHotelReviews(selectedHotel, {
        page: currentPage,
        limit: 10,
        rating: filters.rating || undefined,
        verified: filters.verified || undefined,
        sort: filters.sort
      });
      console.log('Reviews response:', response);
      setReviews(response.data.reviews || []);
      setTotalPages(response.pagination?.pages || 1);
      setError(null);
    } catch (err: any) {
      console.error('Error loading reviews:', err);
      setError(err.message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewSummary = async () => {
    if (!selectedHotel) return;
    
    try {
      console.log('Loading review summary for hotel:', selectedHotel);
      const response = await reviewService.getHotelReviewSummary(selectedHotel);
      console.log('Summary response:', response);
      setReviewSummary(response.data.summary || null);
    } catch (err: any) {
      console.error('Failed to load review summary:', err.message);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await reviewService.markReviewHelpful(reviewId);
      loadReviews(); // Refresh to show updated helpful count
    } catch (err: any) {
      console.error('Failed to mark review as helpful:', err.message);
    }
  };

  const handleReportReview = async (reviewId: string) => {
    const reason = prompt('Please provide a reason for reporting this review:');
    if (!reason) return;

    try {
      await reviewService.reportReview(reviewId, reason);
      alert('Review reported successfully');
    } catch (err: any) {
      alert('Failed to report review: ' + err.message);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderCategoryRating = (categories: Review['categories']) => {
    const categoryNames = {
      cleanliness: 'Cleanliness',
      service: 'Service',
      location: 'Location',
      value: 'Value',
      amenities: 'Amenities'
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {Object.entries(categories).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 capitalize">
              {categoryNames[key as keyof typeof categoryNames]}:
            </span>
            <div className="flex">
              {renderStars(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Guest Reviews</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real experiences from our valued guests. See what makes Pentouz hotels exceptional.
          </p>
        </div>

        {/* Review Summary */}
        {reviewSummary && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {reviewSummary.averageRating.toFixed(1)}
                  </div>
                  <div>
                    <div className="flex">
                      {renderStars(Math.round(reviewSummary.averageRating))}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {reviewSummary.totalReviews} reviews
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
                {Object.entries(reviewSummary.ratingDistribution)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([rating, count]) => (
                    <div key={rating} className="flex items-center space-x-2 mb-2">
                      <span className="text-sm w-8">{rating}★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{
                            width: `${reviewSummary.totalReviews > 0 ? (count / reviewSummary.totalReviews) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  ))}
              </div>

              {/* Category Averages */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Category Ratings</h3>
                {Object.entries(reviewSummary.categoryAverages).map(([category, avg]) => (
                  <div key={category} className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 capitalize">{category}</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {renderStars(Math.round(avg))}
                      </div>
                      <span className="text-sm font-medium">{avg.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
            </div>

            <select
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={3}>3+ Stars</option>
              <option value={2}>2+ Stars</option>
              <option value={1}>1+ Stars</option>
            </select>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.verified}
                onChange={(e) => setFilters({ ...filters, verified: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Verified stays only</span>
            </label>

            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
              <option value="-rating">Highest Rating</option>
              <option value="rating">Lowest Rating</option>
              <option value="-helpfulCount">Most Helpful</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg shadow-lg p-8">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.guestName}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                      {review.isVerified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Award className="w-3 h-3 mr-1" />
                          Verified Stay
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 capitalize">{review.visitType}</span>
                  {review.stayDate && (
                    <span className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {new Date(review.stayDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Content */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{review.title}</h4>
                <p className="text-gray-700 leading-relaxed">{review.content}</p>
              </div>

              {/* Category Ratings */}
              {renderCategoryRating(review.categories)}

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex space-x-2 mt-4">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Review image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-75"
                    />
                  ))}
                </div>
              )}

              {/* Hotel Response */}
              {review.response && (
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-blue-900 mb-2">Response from Hotel Management</h5>
                  <p className="text-blue-800">{review.response.content}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    {new Date(review.response.respondedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Review Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleMarkHelpful(review._id)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">Helpful ({review.helpfulCount})</span>
                  </button>
                  
                  <button
                    onClick={() => handleReportReview(review._id)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    <span className="text-sm">Report</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>Status: {review.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="secondary"
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    variant={currentPage === page ? 'primary' : 'secondary'}
                    className="w-10 h-10"
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && reviews.length === 0 && (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Found</h3>
            <p className="text-gray-600">
              {error ? 'There was an error loading reviews.' : 'No reviews match your current filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}