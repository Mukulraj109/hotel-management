import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskBookingEngine() {
  return (
    <FrontDeskFeatureNotice
      title="Booking Engine Administration Restricted"
      description="Marketing/booking engine setup and campaign controls are admin-only. Frontdesk can continue handling walk-in and reservation operations from booking pages."
      fallbackPath="/frontdesk/bookings"
      fallbackLabel="Open bookings"
    />
  );
}
