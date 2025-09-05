import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { inventoryService, type CalendarData, type InventoryRecord } from '../../services/inventoryService';
import { roomTypeService, type RoomTypeOption } from '../../services/roomTypeService';

interface InventoryCalendarProps {
  hotelId: string;
}

interface CalendarCellData {
  date: string;
  inventory?: InventoryRecord;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  dayOfWeek: number;
}

const InventoryCalendar: React.FC<InventoryCalendarProps> = ({ hotelId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('');
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<CalendarCellData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<{
    availableRooms?: number;
    baseRate?: number;
    sellingRate?: number;
    stopSell?: boolean;
  }>({});
  const [viewMode, setViewMode] = useState<'availability' | 'rates'>('availability');
  const [showStopSell, setShowStopSell] = useState(true);

  useEffect(() => {
    fetchRoomTypes();
  }, [hotelId]);

  useEffect(() => {
    if (selectedRoomTypeId) {
      fetchCalendarData();
    }
  }, [selectedRoomTypeId, currentDate]);

  const fetchRoomTypes = async () => {
    try {
      const data = await roomTypeService.getRoomTypeOptions(hotelId);
      setRoomTypes(data);
      if (data.length > 0 && !selectedRoomTypeId) {
        setSelectedRoomTypeId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch room types');
    }
  };

  const fetchCalendarData = async () => {
    if (!selectedRoomTypeId) return;
    
    try {
      setLoading(true);
      const data = await inventoryService.getInventoryCalendar({
        hotelId,
        roomTypeId: selectedRoomTypeId,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1
      });
      setCalendarData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date: Date): CalendarCellData[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarCellData[] = [];

    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        date: '',
        isToday: false,
        isWeekend: false,
        isPast: false,
        dayOfWeek: i
      });
    }

    // Add cells for each day of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const cellDate = new Date(year, month, day);
      const dateString = cellDate.toISOString().split('T')[0];
      const dayOfWeek = cellDate.getDay();
      
      // Find inventory data for this date
      const selectedRoomType = roomTypes.find(rt => rt.id === selectedRoomTypeId);
      let inventoryData: InventoryRecord | undefined;
      
      if (calendarData && selectedRoomType) {
        const calendarEntry = calendarData.calendar[dateString];
        if (calendarEntry && calendarEntry[selectedRoomType.code]) {
          const entry = calendarEntry[selectedRoomType.code];
          inventoryData = {
            _id: '',
            hotelId,
            roomTypeId: { _id: selectedRoomTypeId, name: selectedRoomType.name, code: selectedRoomType.code, basePrice: selectedRoomType.basePrice },
            date: dateString,
            totalRooms: entry.totalRooms,
            availableRooms: entry.availableRooms,
            soldRooms: entry.soldRooms,
            blockedRooms: entry.blockedRooms,
            baseRate: entry.baseRate,
            sellingRate: entry.sellingRate,
            currency: 'INR',
            stopSellFlag: entry.stopSellFlag,
            closedToArrival: entry.closedToArrival,
            closedToDeparture: entry.closedToDeparture,
            minimumStay: entry.minimumStay,
            maximumStay: entry.maximumStay,
            needsSync: false,
            lastModified: new Date().toISOString()
          };
        }
      }

      days.push({
        date: dateString,
        inventory: inventoryData,
        isToday: cellDate.getTime() === today.getTime(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isPast: cellDate < today,
        dayOfWeek
      });
    }

    return days;
  };

  const getCellColor = (cell: CalendarCellData): string => {
    if (!cell.inventory) return 'bg-gray-100';
    
    const inv = cell.inventory;
    
    if (inv.stopSellFlag && showStopSell) return 'bg-red-100 border-red-300';
    
    if (viewMode === 'availability') {
      const occupancyRate = inv.totalRooms > 0 ? 
        ((inv.soldRooms + inv.blockedRooms) / inv.totalRooms) * 100 : 0;
      
      if (occupancyRate >= 90) return 'bg-red-100 border-red-300';
      if (occupancyRate >= 70) return 'bg-yellow-100 border-yellow-300';
      if (occupancyRate >= 40) return 'bg-green-100 border-green-300';
      return 'bg-blue-100 border-blue-300';
    } else {
      // Rate view
      const selectedRoomType = roomTypes.find(rt => rt.id === selectedRoomTypeId);
      if (!selectedRoomType) return 'bg-gray-100';
      
      const rateVariation = ((inv.sellingRate - selectedRoomType.basePrice) / selectedRoomType.basePrice) * 100;
      
      if (rateVariation > 20) return 'bg-green-100 border-green-300';
      if (rateVariation > 0) return 'bg-yellow-100 border-yellow-300';
      if (rateVariation < -20) return 'bg-red-100 border-red-300';
      return 'bg-blue-100 border-blue-300';
    }
  };

  const handleCellClick = (cell: CalendarCellData) => {
    if (!cell.date || cell.isPast) return;
    
    setSelectedCell(cell);
    setEditData({
      availableRooms: cell.inventory?.availableRooms || 0,
      baseRate: cell.inventory?.baseRate || 0,
      sellingRate: cell.inventory?.sellingRate || 0,
      stopSell: cell.inventory?.stopSellFlag || false
    });
    setShowEditModal(true);
  };

  const handleUpdateInventory = async () => {
    if (!selectedCell || !selectedRoomTypeId) return;

    try {
      await inventoryService.updateInventory({
        hotelId,
        roomTypeId: selectedRoomTypeId,
        date: selectedCell.date,
        availableRooms: editData.availableRooms,
        baseRate: editData.baseRate,
        sellingRate: editData.sellingRate,
        restrictions: {
          stopSellFlag: editData.stopSell
        }
      });
      
      await fetchCalendarData();
      setShowEditModal(false);
      setSelectedCell(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory');
    }
  };

  const toggleStopSellView = () => {
    setShowStopSell(!showStopSell);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedRoomType = roomTypes.find(rt => rt.id === selectedRoomTypeId);
  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Calendar</h1>
          <p className="text-gray-600">Manage room availability and rates by date</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              onClick={() => setViewMode('availability')}
              variant={viewMode === 'availability' ? 'default' : 'ghost'}
              size="sm"
              className="px-3 py-1"
            >
              <Users className="w-4 h-4 mr-1" />
              Availability
            </Button>
            <Button
              onClick={() => setViewMode('rates')}
              variant={viewMode === 'rates' ? 'default' : 'ghost'}
              size="sm"
              className="px-3 py-1"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Rates
            </Button>
          </div>
          
          <Button onClick={toggleStopSellView} variant="outline" size="sm">
            {showStopSell ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showStopSell ? 'Hide' : 'Show'} Stop Sell
          </Button>
          
          <Button onClick={fetchCalendarData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Room Type Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Room Type
              </label>
              <Select
                value={selectedRoomTypeId}
                onChange={setSelectedRoomTypeId}
                options={[
                  { value: '', label: 'Select a room type...' },
                  ...roomTypes.map(rt => ({ value: rt.id, label: `${rt.name} (${rt.code})` }))
                ]}
                className="min-w-0"
              />
            </div>
            
            {selectedRoomType && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Max: {selectedRoomType.maxOccupancy}
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Base: ₹{selectedRoomType.basePrice}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigateMonth('prev')} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
            {monthName}
          </h2>
          <Button onClick={() => navigateMonth('next')} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <Button onClick={goToToday} variant="outline" size="sm">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Today
        </Button>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {viewMode === 'availability' ? (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
                  <span>Low occupancy (&lt;40%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
                  <span>Medium (40-70%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                  <span>High (70-90%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
                  <span>Nearly full (90%+)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
                  <span>Below base (-20%+)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
                  <span>At base rate</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                  <span>Premium (0-20%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
                  <span>High premium (20%+)</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {selectedRoomTypeId ? (
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
                <span className="ml-2 text-gray-600">Loading calendar...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-b">
                    {day}
                  </div>
                ))}
                
                {/* Calendar cells */}
                {days.map((cell, index) => (
                  <div
                    key={index}
                    className={`
                      relative h-20 border border-gray-200 cursor-pointer transition-all hover:shadow-md
                      ${cell.date ? getCellColor(cell) : 'bg-gray-50'}
                      ${cell.isToday ? 'ring-2 ring-blue-500' : ''}
                      ${cell.isPast ? 'opacity-50' : ''}
                    `}
                    onClick={() => handleCellClick(cell)}
                  >
                    {cell.date && (
                      <>
                        <div className="p-1">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(cell.date).getDate()}
                          </div>
                          
                          {cell.inventory && (
                            <div className="text-xs space-y-1">
                              {viewMode === 'availability' ? (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-green-600">A:</span>
                                    <span>{cell.inventory.availableRooms}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-red-600">S:</span>
                                    <span>{cell.inventory.soldRooms}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-blue-600">
                                    ₹{cell.inventory.sellingRate}
                                  </div>
                                  {cell.inventory.baseRate !== cell.inventory.sellingRate && (
                                    <div className="text-gray-500 line-through text-xs">
                                      ₹{cell.inventory.baseRate}
                                    </div>
                                  )}
                                </>
                              )}
                              
                              {cell.inventory.stopSellFlag && showStopSell && (
                                <div className="absolute top-1 right-1">
                                  <XCircle className="w-3 h-3 text-red-600" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Room Type</h3>
            <p className="text-gray-600">Choose a room type to view its inventory calendar</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedCell ? `Edit ${new Date(selectedCell.date).toLocaleDateString()}` : 'Edit Inventory'}
      >
        {selectedCell && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                {selectedRoomType?.name} - {new Date(selectedCell.date).toLocaleDateString()}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Rooms:</span>
                  <span className="ml-2 font-medium">{selectedCell.inventory?.totalRooms || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sold Rooms:</span>
                  <span className="ml-2 font-medium">{selectedCell.inventory?.soldRooms || 0}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available Rooms
              </label>
              <Input
                type="number"
                min="0"
                value={editData.availableRooms || ''}
                onChange={(e) => setEditData({ ...editData, availableRooms: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Rate (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={editData.baseRate || ''}
                  onChange={(e) => setEditData({ ...editData, baseRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Rate (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={editData.sellingRate || ''}
                  onChange={(e) => setEditData({ ...editData, sellingRate: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="stopSell"
                checked={editData.stopSell || false}
                onChange={(e) => setEditData({ ...editData, stopSell: e.target.checked })}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="stopSell" className="ml-2 text-sm text-gray-700">
                Stop Sell (close to new bookings)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateInventory}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update Inventory
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryCalendar;