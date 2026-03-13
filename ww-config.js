export default {
  editor: {
    label: { en: 'Admin Service Status' },
    icon: 'alert-triangle',
    categories: ['content'],
  },
  properties: {
    supabaseUrl: {
      label: { en: 'Supabase URL' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    accessToken: {
      label: { en: 'Auth Token' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    refreshTrigger: {
      label: { en: 'Refresh Trigger' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    portalTarget: {
      label: { en: 'Portal Target' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    userRole: {
      label: { en: 'User Role' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
  },
  triggerEvents: [
    {
      name: 'servicestatus:sent',
      label: { en: 'Alert Sent' },
      event: { alertId: '', headline: '' },
    },
    {
      name: 'servicestatus:saved',
      label: { en: 'Alert Saved' },
      event: { alertId: '' },
    },
    {
      name: 'servicestatus:resolved',
      label: { en: 'Alert Resolved' },
      event: { alertId: '' },
    },
    {
      name: 'servicestatus:error',
      label: { en: 'On Error' },
      event: { message: '' },
    },
  ],
};
