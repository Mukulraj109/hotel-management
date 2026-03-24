import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Hotel/Property Interface
 * Represents a single hotel property in the multi-property system
 */
interface Hotel {
  _id: string;
  name: string;
  address: {
    city: string;
    state: string;
    country: string;
  };
  totalRooms: number;
  propertyGroupId?: string;
  groupSettings?: {
    inheritSettings: boolean;
    lastSyncAt: Date;
  };
}

/**
 * Property Context Type
 * Provides property selection state and management across the application
 */
interface PropertyContextType {
  selectedPropertyId: string | null;
  selectedProperty: Hotel | null;
  properties: Hotel[];
  viewMode: 'single' | 'all';
  isMultiProperty: boolean;
  isLoading: boolean;
  error: Error | null;
  setSelectedPropertyId: (id: string) => void;
  setViewMode: (mode: 'single' | 'all') => void;
}

export const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

/**
 * PropertyProvider Component
 *
 * Manages global property selection state for multi-property hotel management.
 *
 * Features:
 * - Fetches user's properties from /auth/me endpoint using React Query
 * - Persists selected property to localStorage
 * - Supports single property view and portfolio view (all properties)
 * - Auto-selects first property if none selected
 * - Handles multi-property vs. single-property users
 *
 * @example
 * ```tsx
 * <PropertyProvider>
 *   <App />
 * </PropertyProvider>
 * ```
 */
export function PropertyProvider({ children }: { children: React.ReactNode }) {
  // State management for selected property
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string | null>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('selectedPropertyId');
    return stored && stored !== 'null' ? stored : null;
  });

  // State management for view mode (single property or all properties/portfolio)
  const [viewMode, setViewModeState] = useState<'single' | 'all'>(() => {
    const saved = localStorage.getItem('propertyViewMode');
    return (saved as 'single' | 'all') || 'single';
  });

  // Fetch user's properties from API using React Query
  const { data: propertiesData, isLoading, error } = useQuery({
    queryKey: ['user-properties'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      // Extract properties from user object
      // Support both array format and populated objects
      const userData = response.data.data?.user || response.data.user;

      if (userData?.properties && Array.isArray(userData.properties)) {
        return userData.properties;
      }

      // Fallback: if user has hotelId but no properties array, create single-item array
      if (userData?.hotelId) {
        // If hotelId is an object (populated), use it directly
        if (typeof userData.hotelId === 'object' && userData.hotelId._id) {
          return [userData.hotelId];
        }
        // If hotelId is just a string, fetch the hotel details
        const hotelResponse = await api.get(`/admin/hotels/${userData.hotelId}`);
        return [hotelResponse.data.data];
      }

      return [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const properties: Hotel[] = propertiesData || [];
  const isMultiProperty = properties.length > 1;

  // Find selected property object
  const selectedProperty = properties.find((p: Hotel) => p._id === selectedPropertyId) || null;

  // Auto-select first property if none selected and in single view mode
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0 && viewMode === 'single') {
      const firstPropertyId = properties[0]._id;
      setSelectedPropertyIdState(firstPropertyId);
      localStorage.setItem('selectedPropertyId', firstPropertyId);
    }
  }, [properties, selectedPropertyId, viewMode]);

  // Validate selected property is still valid (user might have lost access)
  useEffect(() => {
    if (selectedPropertyId && properties.length > 0) {
      const isValid = properties.some((p: Hotel) => p._id === selectedPropertyId);

      if (!isValid) {
        // Selected property no longer accessible, reset to first property
        const fallbackId = properties[0]._id;
        setSelectedPropertyIdState(fallbackId);
        localStorage.setItem('selectedPropertyId', fallbackId);
      }
    }
  }, [properties, selectedPropertyId]);

  /**
   * Set selected property ID and switch to single view mode
   * Persists selection to localStorage
   */
  const setSelectedPropertyId = (id: string) => {
    setSelectedPropertyIdState(id);
    localStorage.setItem('selectedPropertyId', id);

    // When selecting a specific property, switch to single view mode
    setViewModeState('single');
    localStorage.setItem('propertyViewMode', 'single');
  };

  /**
   * Set view mode (single property or all properties)
   * Persists selection to localStorage
   *
   * When switching to 'single' mode, auto-selects first property if none selected
   */
  const setViewMode = (mode: 'single' | 'all') => {
    setViewModeState(mode);
    localStorage.setItem('propertyViewMode', mode);

    // If switching to single mode and no property selected, select first property
    if (mode === 'single' && !selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0]._id);
    }
  };

  const value: PropertyContextType = {
    selectedPropertyId,
    selectedProperty,
    properties,
    viewMode,
    isMultiProperty,
    isLoading,
    error: error as Error | null,
    setSelectedPropertyId,
    setViewMode,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}

/**
 * useProperty Hook
 *
 * Access property context from any component.
 * Throws error if used outside PropertyProvider.
 *
 * @returns PropertyContextType
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedPropertyId, selectedProperty, setSelectedPropertyId } = useProperty();
 *
 *   return (
 *     <div>
 *       <h1>Current Property: {selectedProperty?.name}</h1>
 *       <p>Property ID: {selectedPropertyId}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Property switching
 * ```tsx
 * function PropertySwitcher() {
 *   const { properties, selectedPropertyId, setSelectedPropertyId } = useProperty();
 *
 *   return (
 *     <select
 *       value={selectedPropertyId || ''}
 *       onChange={(e) => setSelectedPropertyId(e.target.value)}
 *     >
 *       {properties.map(property => (
 *         <option key={property._id} value={property._id}>
 *           {property.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @example Multi-property check
 * ```tsx
 * function AdminDashboard() {
 *   const { isMultiProperty, viewMode, setViewMode } = useProperty();
 *
 *   if (isMultiProperty) {
 *     return (
 *       <div>
 *         <button onClick={() => setViewMode('all')}>
 *           View Portfolio
 *         </button>
 *         {viewMode === 'all' && <PortfolioDashboard />}
 *       </div>
 *     );
 *   }
 *
 *   return <SinglePropertyDashboard />;
 * }
 * ```
 */
export function useProperty() {
  const context = useContext(PropertyContext);

  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }

  return context;
}

// Export types for external use
export type { Hotel, PropertyContextType };
