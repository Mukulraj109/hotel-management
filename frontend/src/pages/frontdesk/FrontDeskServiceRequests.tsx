import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskServiceRequests() {
  return (
    <FrontDeskFeatureNotice
      title="Frontdesk Service Queue Is Operational-Only"
      description="Administrative service request management has been removed from the frontdesk view. Use Guest Services, Maintenance, and Inventory Requests routes for execution workflows."
      fallbackPath="/frontdesk/guest-services"
      fallbackLabel="Open guest services queue"
    />
  );
}
