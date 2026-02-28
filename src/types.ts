// --- Prompt types ---

export type PromptType =
  | 'display'
  | 'confirm'
  | 'choose'
  | 'pick_many'
  | 'text'
  | 'review'
  | 'review_each';

// --- Option items ---

export interface OptionItem {
  label: string;
  image?: string;
}

// --- Payload interfaces (discriminated on `type`) ---

export interface DisplayPayload {
  type: 'display';
  title?: string;
  body?: string;
}

export interface ConfirmPayload {
  type: 'confirm';
  title?: string;
  body?: string;
}

export interface ChoosePayload {
  type: 'choose';
  title?: string;
  body?: string;
  options: OptionItem[];
  filter?: boolean;
}

export interface PickManyPayload {
  type: 'pick_many';
  title?: string;
  body?: string;
  options: OptionItem[];
  filter?: boolean;
}

export interface TextPayload {
  type: 'text';
  title?: string;
  body?: string;
  placeholder?: string;
}

export interface ReviewPayload {
  type: 'review';
  title?: string;
  body?: string;
  actions: string[];
}

export interface ReviewEachPayload {
  type: 'review_each';
  title?: string;
  body?: string;
  options: OptionItem[];
  actions: string[];
}

export type Payload =
  | DisplayPayload
  | ConfirmPayload
  | ChoosePayload
  | PickManyPayload
  | TextPayload
  | ReviewPayload
  | ReviewEachPayload;

// --- Response interfaces ---

export interface DisplayResponse {
  ok: true;
}

export interface ConfirmResponse {
  confirmed: boolean;
}

export interface ChooseResponse {
  chosen: string;
}

export interface PickManyResponse {
  chosen: string[];
}

export interface TextResponse {
  text: string;
}

export interface ReviewResponse {
  action: string;
}

export interface ReviewEachResult {
  label: string;
  action: string;
}

export interface ReviewEachResponse {
  results: ReviewEachResult[];
}

export interface ErrorResponse {
  error: string;
}

export type ServerResponse =
  | DisplayResponse
  | ConfirmResponse
  | ChooseResponse
  | PickManyResponse
  | TextResponse
  | ReviewResponse
  | ReviewEachResponse
  | ErrorResponse;

// --- parse-md internals ---

export interface FrontmatterMeta {
  type?: string;
  filter?: boolean;
  multi?: boolean;
  actions?: string[];
  placeholder?: string;
  [key: string]: unknown;
}

export interface FrontmatterResult {
  meta: FrontmatterMeta;
  body: string;
}

export interface ParsedBody {
  title: string;
  body: string;
  options: OptionItem[];
}
