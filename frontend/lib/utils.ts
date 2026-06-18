import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
export const PRIORITIES = ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'];
export const STATUSES = [
  'New', 'Triaged', 'Investigating', 'Pending Client', 'Escalated',
  'Contained', 'Resolved', 'Closed', 'False Positive', 'Duplicate',
];
export const DISPOSITIONS = [
  'True Positive - Benign', 'True Positive - Suspicious', 'True Positive - Incident',
  'False Positive', 'Duplicate', 'Authorized Activity', 'Needs More Information',
];
export const AI_ACTIONS = ['Accepted', 'Modified', 'Rejected', 'Escalated', 'Not Used'];
