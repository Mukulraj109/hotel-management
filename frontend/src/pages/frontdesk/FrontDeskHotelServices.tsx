import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskHotelServices() {
  return (
    <FrontDeskFeatureNotice
      title="Hotel Service Catalog Management Restricted"
      description="Frontdesk can fulfill service requests but cannot edit service catalog configuration, pricing, or policy settings."
      fallbackPath="/frontdesk/service-requests"
      fallbackLabel="Open service request operations"
    />
  );
}
