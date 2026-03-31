import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskSupply() {
  return (
    <FrontDeskFeatureNotice
      title="Supply Approval Actions Restricted"
      description="Frontdesk users should log and track inventory/service needs, while supply approvals and vendor procurement remain admin-managed."
      fallbackPath="/frontdesk/inventory-requests"
      fallbackLabel="Open inventory requests"
    />
  );
}
