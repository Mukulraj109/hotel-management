import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttled callbacks
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime.current;

      if (timeSinceLastCall >= delay) {
        lastCallTime.current = now;
        return callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastCallTime.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      const isIntersecting = entry.isIntersecting;
      setIsVisible(isIntersecting);
      
      if (isIntersecting && !hasBeenVisible) {
        setHasBeenVisible(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options, hasBeenVisible]);

  return {
    elementRef,
    isVisible,
    hasBeenVisible,
  };
}

// Hook for memory-efficient data caching
export function useMemoryCache<T>(
  key: string,
  maxSize: number = 50
): [Map<string, T>, (key: string, value: T) => void, (key: string) => void] {
  const cache = useMemo(() => new Map<string, T>(), []);
  const accessOrder = useRef<string[]>([]);

  const set = useCallback((cacheKey: string, value: T) => {
    // Remove if already exists to update access order
    if (cache.has(cacheKey)) {
      const index = accessOrder.current.indexOf(cacheKey);
      if (index > -1) {
        accessOrder.current.splice(index, 1);
      }
    }

    // Add to cache and access order
    cache.set(cacheKey, value);
    accessOrder.current.push(cacheKey);

    // Remove oldest if exceeds max size
    while (accessOrder.current.length > maxSize) {
      const oldest = accessOrder.current.shift();
      if (oldest) {
        cache.delete(oldest);
      }
    }
  }, [cache, maxSize]);

  const remove = useCallback((cacheKey: string) => {
    cache.delete(cacheKey);
    const index = accessOrder.current.indexOf(cacheKey);
    if (index > -1) {
      accessOrder.current.splice(index, 1);
    }
  }, [cache]);

  return [cache, set, remove];
}

// Hook for optimized data fetching with caching
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    refetchInterval?: number;
    enabled?: boolean;
    select?: (data: T) => any;
  } = {}
) {
  const queryClient = useQueryClient();
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    enabled = true,
    select,
  } = options;

  // Preload related data when this query succeeds
  const handleSuccess = useCallback((data: T) => {
    // Example: preload related queries
    // This can be customized based on the data structure
  }, []);

  return {
    queryKey,
    queryFn,
    staleTime,
    cacheTime,
    refetchInterval,
    enabled,
    select,
    onSuccess: handleSuccess,
  };
}

// Hook for batch operations
export function useBatchOperations<T>(
  batchSize: number = 10,
  delay: number = 100
) {
  const [queue, setQueue] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef<NodeJS.Timeout>();

  const addToQueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);
  }, []);

  const processBatch = useCallback(
    async (processor: (batch: T[]) => Promise<void> | void) => {
      if (queue.length === 0 || isProcessing) return;

      setIsProcessing(true);
      
      try {
        const batch = queue.slice(0, batchSize);
        setQueue(prev => prev.slice(batchSize));
        
        await processor(batch);
        
        // Process remaining items after delay
        if (queue.length > batchSize) {
          processingRef.current = setTimeout(() => {
            setIsProcessing(false);
            processBatch(processor);
          }, delay);
        } else {
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        setIsProcessing(false);
      }
    },
    [queue, batchSize, delay, isProcessing]
  );

  useEffect(() => {
    return () => {
      if (processingRef.current) {
        clearTimeout(processingRef.current);
      }
    };
  }, []);

  return {
    queue,
    addToQueue,
    processBatch,
    isProcessing,
    queueSize: queue.length,
  };
}

// Hook for performance monitoring
export function usePerformanceMonitoring(
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const now = Date.now();
    const renderTime = now - lastRenderTime.current;
    
    renderTimes.current.push(renderTime);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    lastRenderTime.current = now;

    // Log performance metrics every 10 renders
    if (renderCount.current % 10 === 0) {
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
      console.log(`${componentName} Performance:`, {
        renders: renderCount.current,
        avgRenderTime: avgRenderTime.toFixed(2) + 'ms',
        lastRenderTime: renderTime + 'ms',
      });
    }
  });

  const getMetrics = useCallback(() => ({
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
  }), []);

  return { getMetrics };
}

// Hook for image lazy loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const { elementRef, hasBeenVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  useEffect(() => {
    if (hasBeenVisible && src && !isLoaded && !isError) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setIsError(true);
      };
      
      img.src = src;
    }
  }, [hasBeenVisible, src, isLoaded, isError]);

  return {
    elementRef,
    imageSrc,
    isLoaded,
    isError,
    hasBeenVisible,
  };
}