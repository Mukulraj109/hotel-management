import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  Star,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  Plus,
  MessageSquare,
  Bell
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

interface WaitingListEntry {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  roomType: string;
  preferredDates: {
    checkIn: string;
    checkOut: string;
  };
  alternativeDates?: {
    checkIn: string;
    checkOut: string;
  }[];
  guests: number;
  priority: 'high' | 'medium' | 'low';
  vipStatus: boolean;
  specialRequests: string;
  contactPreference: 'email' | 'phone' | 'sms';
  maxRate?: number;
  status: 'active' | 'contacted' | 'confirmed' | 'expired' | 'cancelled';
  addedDate: string;
  lastContact?: string;
  notes: string[];
  loyaltyTier?: string;
  source: string;
}

interface RoomAvailability {
  roomType: string;
  available: number;
  total: number;
  nextAvailable: string;
}

export const WaitingListManager: React.FC = () => {
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [filteredList, setFilteredList] = useState<WaitingListEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<WaitingListEntry | null>(null);
  const [roomAvailability, setRoomAvailability] = useState<RoomAvailability[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<WaitingListEntry>>({
    guestName: '',
    email: '',
    phone: '',
    roomType: '',
    preferredDates: { checkIn: '', checkOut: '' },
    guests: 2,
    priority: 'medium',
    vipStatus: false,
    specialRequests: '',
    contactPreference: 'email',
    status: 'active',
    notes: [],
    source: 'direct'
  });

  const mockWaitingList: WaitingListEntry[] = [
    {
      id: 'WL001',
      guestName: 'Sarah Johnson',
      email: 'sarah@email.com',
      phone: '+1-555-0123',
      roomType: 'Deluxe Suite',
      preferredDates: { checkIn: '2024-12-15', checkOut: '2024-12-18' },
      alternativeDates: [
        { checkIn: '2024-12-20', checkOut: '2024-12-23' },
        { checkIn: '2024-12-22', checkOut: '2024-12-25' }
      ],
      guests: 2,
      priority: 'high',
      vipStatus: true,
      specialRequests: 'Ocean view preferred, late checkout',
      contactPreference: 'email',
      maxRate: 450,
      status: 'active',
      addedDate: '2024-12-01',
      lastContact: '2024-12-03',
      notes: ['VIP guest', 'Previous stay: 5-star rating', 'Preferred room 301'],
      loyaltyTier: 'Platinum',
      source: 'direct'
    },
    {
      id: 'WL002',
      guestName: 'Michael Chen',
      email: 'mchen@company.com',
      phone: '+1-555-0456',
      roomType: 'Executive Room',
      preferredDates: { checkIn: '2024-12-12', checkOut: '2024-12-14' },
      guests: 1,
      priority: 'medium',
      vipStatus: false,
      specialRequests: 'Business center access, early breakfast',
      contactPreference: 'phone',
      maxRate: 280,
      status: 'contacted',
      addedDate: '2024-11-28',
      lastContact: '2024-12-02',
      notes: ['Corporate rate requested', 'Frequent business traveler'],
      loyaltyTier: 'Gold',
      source: 'booking.com'
    },
    {
      id: 'WL003',
      guestName: 'Emily Rodriguez',
      email: 'emily.r@email.com',
      phone: '+1-555-0789',
      roomType: 'Standard Room',
      preferredDates: { checkIn: '2024-12-20', checkOut: '2024-12-22' },
      alternativeDates: [
        { checkIn: '2024-12-23', checkOut: '2024-12-25' }
      ],
      guests: 3,
      priority: 'low',
      vipStatus: false,
      specialRequests: 'Family room, extra bed for child',
      contactPreference: 'sms',
      maxRate: 180,
      status: 'active',
      addedDate: '2024-12-02',
      notes: ['First-time guest', 'Family vacation'],
      source: 'expedia'
    }
  ];

  const mockRoomAvailability: RoomAvailability[] = [
    { roomType: 'Standard Room', available: 3, total: 12, nextAvailable: '2024-12-10' },
    { roomType: 'Deluxe Room', available: 1, total: 8, nextAvailable: '2024-12-12' },
    { roomType: 'Executive Room', available: 0, total: 6, nextAvailable: '2024-12-14' },
    { roomType: 'Deluxe Suite', available: 0, total: 4, nextAvailable: '2024-12-16' },
    { roomType: 'Presidential Suite', available: 1, total: 2, nextAvailable: '2024-12-08' }
  ];

  useEffect(() => {
    setWaitingList(mockWaitingList);
    setRoomAvailability(mockRoomAvailability);
  }, []);

  useEffect(() => {
    let filtered = waitingList.filter(entry => {
      const matchesSearch = entry.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.roomType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || entry.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
    });

    setFilteredList(filtered);
  }, [waitingList, searchTerm, statusFilter, priorityFilter]);

  const updateEntryStatus = (entryId: string, newStatus: WaitingListEntry['status']) => {
    setWaitingList(waitingList.map(entry => 
      entry.id === entryId 
        ? { ...entry, status: newStatus, lastContact: new Date().toISOString().split('T')[0] }
        : entry
    ));
    
    toast({
      title: "Status Updated",
      description: `Entry marked as ${newStatus}`
    });
  };

  const updatePriority = (entryId: string, newPriority: WaitingListEntry['priority']) => {
    setWaitingList(waitingList.map(entry => 
      entry.id === entryId ? { ...entry, priority: newPriority } : entry
    ));
    
    toast({
      title: "Priority Updated",
      description: `Priority changed to ${newPriority}`
    });
  };

  const addNote = (entryId: string, note: string) => {
    if (!note.trim()) return;
    
    setWaitingList(waitingList.map(entry => 
      entry.id === entryId 
        ? { ...entry, notes: [...entry.notes, `${new Date().toLocaleDateString()}: ${note}`] }
        : entry
    ));
    
    toast({
      title: "Note Added",
      description: "Note has been added to the entry"
    });
  };

  const removeFromWaitingList = (entryId: string) => {
    setWaitingList(waitingList.filter(entry => entry.id !== entryId));
    setSelectedEntry(null);
    
    toast({
      title: "Entry Removed",
      description: "Entry has been removed from waiting list"
    });
  };

  const addNewEntry = () => {
    if (!newEntry.guestName || !newEntry.email || !newEntry.roomType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const entry: WaitingListEntry = {
      id: `WL${String(waitingList.length + 1).padStart(3, '0')}`,
      guestName: newEntry.guestName!,
      email: newEntry.email!,
      phone: newEntry.phone || '',
      roomType: newEntry.roomType!,
      preferredDates: newEntry.preferredDates!,
      guests: newEntry.guests || 2,
      priority: newEntry.priority || 'medium',
      vipStatus: newEntry.vipStatus || false,
      specialRequests: newEntry.specialRequests || '',
      contactPreference: newEntry.contactPreference || 'email',
      maxRate: newEntry.maxRate,
      status: 'active',
      addedDate: new Date().toISOString().split('T')[0],
      notes: [],
      loyaltyTier: newEntry.loyaltyTier,
      source: newEntry.source || 'direct'
    };

    setWaitingList([...waitingList, entry]);
    setNewEntry({
      guestName: '',
      email: '',
      phone: '',
      roomType: '',
      preferredDates: { checkIn: '', checkOut: '' },
      guests: 2,
      priority: 'medium',
      vipStatus: false,
      specialRequests: '',
      contactPreference: 'email',
      status: 'active',
      notes: [],
      source: 'direct'
    });
    setShowAddEntry(false);
    
    toast({
      title: "Entry Added",
      description: "New waiting list entry has been created"
    });
  };

  const sendNotification = (entry: WaitingListEntry) => {
    toast({
      title: "Notification Sent",
      description: `Room availability notification sent to ${entry.guestName} via ${entry.contactPreference}`
    });
  };

  const checkAvailabilityMatch = (entry: WaitingListEntry) => {
    const roomAvail = roomAvailability.find(r => r.roomType === entry.roomType);
    return roomAvail && roomAvail.available > 0;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'contacted': return 'secondary';
      case 'confirmed': return 'default';
      case 'expired': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Waiting List Manager</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddEntry(true)} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
          <Button variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            Send Notifications
          </Button>
        </div>
      </div>

      {/* Room Availability Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Current Room Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {roomAvailability.map(room => (
              <div key={room.roomType} className="text-center p-4 bg-muted rounded-lg">
                <div className="font-medium text-sm">{room.roomType}</div>
                <div className="text-2xl font-bold mt-2">
                  <span className={room.available > 0 ? 'text-green-600' : 'text-red-600'}>
                    {room.available}
                  </span>
                  <span className="text-muted-foreground text-sm">/{room.total}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Next: {room.nextAvailable}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              {filteredList.length} of {waitingList.length} entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waiting List Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {filteredList.map(entry => (
            <Card 
              key={entry.id} 
              className={`cursor-pointer transition-colors ${
                selectedEntry?.id === entry.id ? 'border-blue-500' : ''
              } ${checkAvailabilityMatch(entry) ? 'border-l-4 border-l-green-500' : ''}`}
              onClick={() => setSelectedEntry(entry)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    {entry.vipStatus && <Star className="mr-2 h-4 w-4 text-yellow-500" />}
                    {entry.guestName}
                    {entry.loyaltyTier && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {entry.loyaltyTier}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(entry.priority)}`} />
                    <Badge variant={getStatusColor(entry.status) as any}>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {entry.preferredDates.checkIn} to {entry.preferredDates.checkOut}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {entry.guests} guests • {entry.roomType}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    Added: {entry.addedDate}
                    {entry.lastContact && ` • Last contact: ${entry.lastContact}`}
                  </div>
                  {checkAvailabilityMatch(entry) && (
                    <div className="flex items-center text-sm text-green-600 font-medium">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Room Available Now!
                    </div>
                  )}
                  {entry.maxRate && (
                    <div className="text-sm text-muted-foreground">
                      Max rate: ${entry.maxRate}/night
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredList.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No waiting list entries match your filters
              </CardContent>
            </Card>
          )}
        </div>

        {/* Entry Details */}
        <div>
          {selectedEntry ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Entry Details</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePriority(selectedEntry.id, 'high')}
                      disabled={selectedEntry.priority === 'high'}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePriority(selectedEntry.id, 'low')}
                      disabled={selectedEntry.priority === 'low'}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Information */}
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      {selectedEntry.email}
                    </div>
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      {selectedEntry.phone || 'Not provided'}
                    </div>
                    <div className="text-muted-foreground">
                      Preferred contact: {selectedEntry.contactPreference}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div>
                  <h4 className="font-medium mb-2">Booking Details</h4>
                  <div className="space-y-1 text-sm">
                    <div>Room Type: {selectedEntry.roomType}</div>
                    <div>Guests: {selectedEntry.guests}</div>
                    <div>Preferred: {selectedEntry.preferredDates.checkIn} to {selectedEntry.preferredDates.checkOut}</div>
                    {selectedEntry.alternativeDates && selectedEntry.alternativeDates.length > 0 && (
                      <div>
                        Alternative dates:
                        {selectedEntry.alternativeDates.map((dates, idx) => (
                          <div key={idx} className="ml-4 text-muted-foreground">
                            • {dates.checkIn} to {dates.checkOut}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                {selectedEntry.specialRequests && (
                  <div>
                    <h4 className="font-medium mb-2">Special Requests</h4>
                    <p className="text-sm text-muted-foreground">{selectedEntry.specialRequests}</p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <div className="space-y-1">
                    {selectedEntry.notes.map((note, idx) => (
                      <div key={idx} className="text-sm bg-muted p-2 rounded">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateEntryStatus(selectedEntry.id, 'contacted')}
                      disabled={selectedEntry.status === 'contacted'}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Mark Contacted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendNotification(selectedEntry)}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Notify Available
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => updateEntryStatus(selectedEntry.id, 'confirmed')}
                      disabled={selectedEntry.status === 'confirmed'}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFromWaitingList(selectedEntry.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Remove Entry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Select an entry to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Waiting List Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Guest Name *"
                  value={newEntry.guestName}
                  onChange={(e) => setNewEntry({...newEntry, guestName: e.target.value})}
                />
                <Input
                  placeholder="Email *"
                  type="email"
                  value={newEntry.email}
                  onChange={(e) => setNewEntry({...newEntry, email: e.target.value})}
                />
                <Input
                  placeholder="Phone"
                  value={newEntry.phone}
                  onChange={(e) => setNewEntry({...newEntry, phone: e.target.value})}
                />
                <Select
                  value={newEntry.roomType}
                  onValueChange={(value) => setNewEntry({...newEntry, roomType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Room Type *" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomAvailability.map(room => (
                      <SelectItem key={room.roomType} value={room.roomType}>
                        {room.roomType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Check-in Date"
                  type="date"
                  value={newEntry.preferredDates?.checkIn}
                  onChange={(e) => setNewEntry({
                    ...newEntry,
                    preferredDates: {...newEntry.preferredDates!, checkIn: e.target.value}
                  })}
                />
                <Input
                  placeholder="Check-out Date"
                  type="date"
                  value={newEntry.preferredDates?.checkOut}
                  onChange={(e) => setNewEntry({
                    ...newEntry,
                    preferredDates: {...newEntry.preferredDates!, checkOut: e.target.value}
                  })}
                />
                <Input
                  placeholder="Number of Guests"
                  type="number"
                  min="1"
                  value={newEntry.guests}
                  onChange={(e) => setNewEntry({...newEntry, guests: parseInt(e.target.value) || 1})}
                />
                <Select
                  value={newEntry.priority}
                  onValueChange={(value: any) => setNewEntry({...newEntry, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Max Rate (optional)"
                  type="number"
                  value={newEntry.maxRate || ''}
                  onChange={(e) => setNewEntry({...newEntry, maxRate: parseFloat(e.target.value) || undefined})}
                />
                <Select
                  value={newEntry.contactPreference}
                  onValueChange={(value: any) => setNewEntry({...newEntry, contactPreference: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Contact Preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Special Requests"
                value={newEntry.specialRequests}
                onChange={(e) => setNewEntry({...newEntry, specialRequests: e.target.value})}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddEntry(false)}>
                  Cancel
                </Button>
                <Button onClick={addNewEntry}>
                  Add Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};