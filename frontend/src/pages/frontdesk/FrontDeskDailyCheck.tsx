import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskDailyCheck() {
  return (
    <FrontDeskFeatureNotice
      title="Daily Check Configuration Restricted"
      description="Template and policy controls for daily checks are managed by admins. Frontdesk should execute assigned operational checklists."
    />
  );
}
