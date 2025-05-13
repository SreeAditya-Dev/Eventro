
export interface EventDay {
  id: string;
  event_id: string;
  day_number: number;
  day_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  event_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
  // Extended properties for UI display
  sender_name?: string;
  recipient_name?: string;
  event_title?: string;
}
