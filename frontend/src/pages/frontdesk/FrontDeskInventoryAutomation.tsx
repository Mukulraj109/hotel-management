import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskInventoryAutomation() {
  return (
    <FrontDeskFeatureNotice
      title="Automation Configuration Restricted"
      description="Inventory and workflow automation setup is admin-only. Frontdesk can still execute assigned operational tasks."
      fallbackPath="/frontdesk/inventory"
      fallbackLabel="Open inventory operations"
    />
  );
}
