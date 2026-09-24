/** What a help-page note is about. Shared by the form and the server. */
export const FEEDBACK_KINDS = [
  { key: 'bug', label: 'Kažkas neveikia' },
  { key: 'idea', label: 'Idėja ar patobulinimas' },
  { key: 'market', label: 'Noriu sporto ar rinkos' },
  { key: 'other', label: 'Kita' },
] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]['key']
