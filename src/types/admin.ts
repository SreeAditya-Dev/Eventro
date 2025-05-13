
export interface Event {
  id: string;
  title: string;
  date: string;
  end_date?: string | null;
  description?: string | null;
  location: string;
  image_url: string;
  organizer: string;
  category: string;
  price: string;
  attendees?: number | null;
  tags?: string[] | null;
  is_featured?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  ticket_id?: string | null;
  event_id: string;
  checked_in_at: string;
  checked_in_by?: string | null;
  event_day?: number;
}

export interface Distribution {
  id: string;
  attendee_id: string;
  item_type: string;
  timestamp: string;
  event_id?: string | null;
  distributed_by?: string | null;
  event_day?: number;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  unique_code: string;
  company?: string | null;
  position?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventFinancial {
  id: string;
  event_id: string;
  bill_name: string;
  bill_amount: number;
  bill_date: string;
  bill_category: string;
  bill_description?: string | null;
  receipt_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventActivity {
  id: string;
  event_id: string;
  activity_name: string;
  activity_description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  required_resources?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventReminder {
  id: string;
  event_id: string;
  reminder_date: string;
  reminder_title: string;
  reminder_description: string;
  is_sent?: boolean;
  created_at: string;
  updated_at: string;
}
