import SearchService from '../services/searchService.js';

const searchService = new SearchService();

class SearchController {
  async globalSearch(req, res) {
    try {
      const { q: query } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const options = {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        entities: req.query.entities ? req.query.entities.split(',') : ['reservations', 'guests', 'invoices', 'rooms', 'services'],
        sortBy: req.query.sortBy || 'relevance',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const results = await searchService.globalSearch(query, options);
      
      if (req.user) {
        await searchService.saveSearchHistory(req.user.id, query, results.total);
      }

      res.json({
        success: true,
        data: results
      });
      
    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during search'
      });
    }
  }

  async getSearchSuggestions(req, res) {
    try {
      const { q: query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const suggestions = await searchService.getSearchSuggestions(query, limit);

      res.json({
        success: true,
        data: suggestions
      });
      
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get search suggestions'
      });
    }
  }

  parseFilters(filtersString) {
    if (!filtersString) return {};
    
    try {
      return JSON.parse(filtersString);
    } catch (error) {
      console.error('Error parsing filters:', error);
      return {};
    }
  }
}

export default new SearchController();