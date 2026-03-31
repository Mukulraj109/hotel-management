import React from 'react';
import FrontDeskFeatureNotice from './FrontDeskFeatureNotice';

export default function FrontDeskStaffManagement() {
  return (
    <FrontDeskFeatureNotice
      title="Staff Management Restricted"
      description="Creating, editing, or deactivating staff accounts is an admin/manager responsibility."
    />
  );
}
