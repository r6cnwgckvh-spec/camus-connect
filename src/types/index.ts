export interface User {
  id: string;
  googleId: string;
  username: string | null;
  name: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  gender: string | null;
  dob: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  collegeId: string | null;
  college?: College | null;
  course: string | null;
  branch: string | null;
  yearOfStudy: string | null;
  lookingFor: string[];
  onboardingCompleted: boolean;
  verifiedBadge: boolean;
  role: 'user' | 'admin';
  compatibilityAnswers: Record<string, string> | null;
  createdAt: string;
  lastActive: string | null;
}

export interface College {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string;
  affiliation: string;
  lat: number | null;
  lng: number | null;
  pending: boolean;
  submittedBy: string | null;
}

export interface Listing {
  id: string;
  userId: string;
  user?: User;
  listingType: 'have_room' | 'looking_room';
  lat: number;
  lng: number;
  address: string;
  rentMin: number | null;
  rentMax: number | null;
  moveInDate: string | null;
  roomType: 'single' | 'shared' | 'pg' | 'flat' | null;
  amenities: string[];
  photos: string[];
  preferredGender: string | null;
  description: string | null;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface Connection {
  id: string;
  requesterId: string;
  requester?: User;
  receiverId: string;
  receiver?: User;
  status: 'pending' | 'accepted' | 'declined';
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  sender?: User;
  content: string;
  sentAt: string;
  readAt: string | null;
}

export interface GlobalMessage {
  id: string;
  userId: string;
  user?: User;
  content: string;
  flagged: boolean;
  flagReason: string | null;
  moderated: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'connect_request' | 'connect_accepted' | 'new_message' | 'listing_match' | 'college_approved' | 'listing_expiring' | 'report_action';
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  reportedListingId: string | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}
