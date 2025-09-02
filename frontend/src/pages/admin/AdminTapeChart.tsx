import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import TapeChartView from '../../components/tapechart/TapeChartView';
import RoomBlocks from '../../components/tapechart/RoomBlocks';
import AdvancedReservations from '../../components/tapechart/AdvancedReservations';
import AssignmentRules from '../../components/tapechart/AssignmentRules';
import TapeChartDashboard from '../../components/tapechart/TapeChartDashboard';
import { WaitingListManager } from '../../components/reservations/WaitingListManager';

const AdminTapeChart: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tapechart">Tape Chart</TabsTrigger>
          <TabsTrigger value="blocks">Room Blocks</TabsTrigger>
          <TabsTrigger value="reservations">Advanced Reservations</TabsTrigger>
          <TabsTrigger value="rules">Assignment Rules</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TapeChartDashboard />
        </TabsContent>

        <TabsContent value="tapechart">
          <TapeChartView />
        </TabsContent>

        <TabsContent value="blocks">
          <RoomBlocks />
        </TabsContent>

        <TabsContent value="reservations">
          <AdvancedReservations />
        </TabsContent>

        <TabsContent value="rules">
          <AssignmentRules />
        </TabsContent>

        <TabsContent value="waitlist">
          <WaitingListManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTapeChart;