export interface Stack {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  category_id: string;
  version: number;
  is_deleted: boolean;
  deleted_at: string | null;
  is_public: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface StackVersion {
  id: string;
  stack_id: string;
  version: number;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

export interface StackCategory {
  id: string;
  stack_id: string;
  category_id: string;
  created_at: string;
}

export interface StackShare {
  id: string;
  stack_id: string;
  share_type: 'link' | 'embed';
  token: string;
  expires_at: string | null;
  created_at: string;
  created_by: string;
}

export interface StackSupplement {
  id: string;
  name: string;
  description: string | null;
  dosage_amount: number;
  dosage_unit_id: string;
  frequency_amount: number;
  frequency_schedule_id: string;
  administration_method_id: string;
  notes: string | null;
}

export interface StackFormData {
  name: string;
  description: string;
  category_id: string;
  categories: string[];
  supplements: StackSupplement[];
}
