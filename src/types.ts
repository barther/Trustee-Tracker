export type ItemStatus = 'Open' | 'Tabled' | 'Closed' | 'Declined';

export type DefaultSection = 'Auto' | 'Update' | 'OldBusiness' | 'NewBusiness';

export type AgendaSection = 'Update' | 'OldBusiness' | 'NewBusiness' | 'Tabled';

export type EntrySection = 'Update' | 'OldBusiness' | 'NewBusiness' | 'OtherBusiness';

export const TAGS = [
  'Building',
  'Finance',
  'Grounds',
  'Security',
  'HVAC',
  'Accessibility',
  'Furniture',
  'FacilityUse',
  'Budget',
  'Vendors',
  'Personnel',
  'Technology',
  'SafetySanctuary',
] as const;

export type Tag = (typeof TAGS)[number];

export type MeetingType = 'Regular' | 'Special';

export type DecisionType = 'Approval' | 'Denial' | 'Authorization' | 'Procedural';

export type ActionStatus = 'Open' | 'Done' | 'Dropped';

export type VendorStatus = 'Active' | 'Inactive' | 'Disputed';

export interface Item {
  id: string;
  title: string;
  status: ItemStatus;
  standing: boolean;
  defaultSection: DefaultSection;
  tags: Tag[];
  assignedTo?: string;
  firstRaisedDate?: string;
  firstRaisedMeetingId?: string;
  closedDate?: string;
  closedReason?: string;
  onHoldReason?: string;
  deferredUntil?: string;
  notes?: string;
}

export interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  meetingType: MeetingType;
  location?: string;
  membersPresent?: string;
  membersAbsent?: string;
  guests?: string;
  openingPrayerBy?: string;
  adjournedAt?: string;
  nextMeetingDate?: string;
  openCloseThisMonth?: string;
  openCloseNextMonth?: string;
}

export interface MeetingEntry {
  id: string;
  title: string;
  meetingId: string;
  meetingDate: string;
  itemId: string;
  section: EntrySection;
  sortOrder: number;
  narrative?: string;
  statusChangeTo?: ItemStatus;
}

export interface Decision {
  id: string;
  title: string;
  summary: string;
  meetingEntryId: string;
  meetingId: string;
  itemId: string;
  decisionDate: string;
  decisionType: DecisionType;
  motionBy?: string;
  secondBy?: string;
  vote?: string;
  amount?: number;
  vendor?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  meetingEntryId: string;
  itemId: string;
  assignedAtMeetingId: string;
  dueHint?: string;
  status: ActionStatus;
  completedAtMeetingId?: string;
  completedNote?: string;
}

export interface Vendor {
  id: string;
  title: string;
  contactName?: string;
  phone?: string;
  trade?: string;
  status: VendorStatus;
  relationshipNotes?: string;
}
