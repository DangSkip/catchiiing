// --- Prompt types ---

export type PromptType =
  | 'display'
  | 'confirm'
  | 'choose'
  | 'pick_many'
  | 'text'
  | 'review'
  | 'review_each'
  | 'form'
  | 'compare'
  | 'rank'
  | 'range'
  | 'rating'
  | 'file';

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

export type FormFieldType = 'text' | 'textarea' | 'select' | 'toggle';

export interface FormField {
  label: string;
  fieldType: FormFieldType;
  options?: string[];
  defaultValue?: string | boolean;
}

export interface FormPayload {
  type: 'form';
  title?: string;
  body?: string;
  fields: FormField[];
}

export interface CompareSection {
  label: string;
  content: string;
}

export interface ComparePayload {
  type: 'compare';
  title?: string;
  sections: CompareSection[];
}

export interface RankPayload {
  type: 'rank';
  title?: string;
  body?: string;
  options: OptionItem[];
}

export interface RangePayload {
  type: 'range';
  title?: string;
  body?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
}

export interface RatingPayload {
  type: 'rating';
  title?: string;
  body?: string;
  max?: number;
  style?: 'stars' | 'thumbs';
}

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  extension?: string;
}

export interface FilePickerPayload {
  type: 'file';
  title?: string;
  body?: string;
  root?: string;
  extensions?: string[];
  multi?: boolean;
}

export interface FilePickerResponse {
  chosen: string | string[];
}

export type Payload =
  | DisplayPayload
  | ConfirmPayload
  | ChoosePayload
  | PickManyPayload
  | TextPayload
  | ReviewPayload
  | ReviewEachPayload
  | FormPayload
  | ComparePayload
  | RankPayload
  | RangePayload
  | RatingPayload
  | FilePickerPayload;

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

export interface FormResponse {
  values: Record<string, string | boolean>;
}

export interface RankResponse {
  ranked: string[];
}

export interface RangeResponse {
  value: number;
}

export interface RatingResponse {
  rating: number | string;
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
  | FormResponse
  | RankResponse
  | RangeResponse
  | RatingResponse
  | FilePickerResponse
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
