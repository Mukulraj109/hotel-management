# Deployment Fix for Service Requests Error

## Problem
The error "Unexpected token '<', "<!doctype "... is not valid JSON" occurs because the API calls are returning HTML instead of JSON in deployment.

## Root Cause
1. Hardcoded localhost URLs in services
2. Missing environment variable configuration
3. Incorrect API routing in deployment

## Solution Applied

### 1. Created Centralized API Configuration
- Added `frontend/src/config/api.ts` for consistent API URL management
- Uses environment variables in production, localhost in development

### 2. Fixed All Hardcoded URLs
Updated these files to use the centralized configuration:
- `frontend/src/services/adminGuestServicesService.ts`
- `frontend/src/services/adminSupplyRequestsService.ts`
- `frontend/src/services/staffSupplyRequestsService.ts`
- `frontend/src/services/bookingFormService.ts`
- `frontend/src/services/realTimeService.ts`
- `frontend/src/hooks/useWebSocket.ts`
- `frontend/src/utils/auth.ts`
- `frontend/src/components/pos/UnifiedBillingSystem.tsx`

### 3. Added Better Error Handling
- Enhanced `fetchWithAuth` method to detect non-JSON responses
- Added detailed error logging for debugging

### 4. Created Deployment Configuration Files
- `frontend/public/_redirects` (for Netlify)
- `frontend/vercel.json` (for Vercel)

## Deployment Steps

### For Netlify:
1. Set environment variables in Netlify dashboard:
   ```
   VITE_API_URL=https://your-backend-domain.com/api/v1
   VITE_WS_URL=wss://your-backend-domain.com
   ```

2. Update `frontend/public/_redirects`:
   ```
   /api/*  https://your-backend-domain.com/api/:splat  200
   ```

### For Vercel:
1. Set environment variables in Vercel dashboard:
   ```
   VITE_API_URL=https://your-backend-domain.com/api/v1
   VITE_WS_URL=wss://your-backend-domain.com
   ```

2. Update `frontend/vercel.json` with your backend URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://your-backend-domain.com/api/$1"
       }
     ]
   }
   ```

### For Other Platforms:
Set these environment variables:
- `VITE_API_URL`: Your backend API URL
- `VITE_WS_URL`: Your WebSocket URL

## Testing
After deployment, check the browser console for:
1. API request URLs (should not contain localhost)
2. Any remaining "Unexpected token" errors
3. Network tab to verify API calls are going to correct endpoints

## Additional Notes
- The fix ensures all API calls use the correct URLs in production
- Better error messages will help identify any remaining issues
- The centralized configuration makes future updates easier
