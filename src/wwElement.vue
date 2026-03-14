<template>
  <div v-if="!content.portalTarget || content.portalTarget === 'admin'" class="spread-ss">
    <div v-if="permissionGranted !== true" class="spread-perm-overlay" style="position:absolute;inset:0;z-index:9999;background:var(--spread-cream,#FBFAF8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px;text-align:center;">
      <div v-if="permissionGranted === null" style="width:24px;height:24px;border:3px solid rgba(0,0,0,0.1);border-top-color:var(--spread-accent,#CE6632);border-radius:50%;animation:spread-perm-spin 0.7s linear infinite;"></div>
      <template v-else>
        <span style="font-size:32px;line-height:1;">🔒</span>
        <strong style="font-size:15px;font-weight:700;color:var(--spread-black,#141414);margin:0;">Access denied</strong>
        <span style="font-size:13px;color:var(--spread-mid-grey,#6B7280);">You don't have permission to view this area.</span>
      </template>
    </div>
    <!-- Header -->
    <div class="spread-ss__header">
      <h2 class="spread-ss__title">Service Status</h2>
      <button class="spread-ss__btn spread-ss__btn--outline" :disabled="loading" @click="loadAlerts">
        <span v-if="loading" class="spread-ss__spinner spread-ss__spinner--sm"></span>
        <span v-else>↻ Refresh</span>
      </button>
    </div>

    <!-- Auto-detected drafts banner -->
    <div v-if="autoDraftAlerts.length > 0" class="spread-ss__auto-banner">
      <div class="spread-ss__auto-banner-icon">⚠</div>
      <div class="spread-ss__auto-banner-content">
        <strong>{{ autoDraftAlerts.length }} auto-detected alert{{ autoDraftAlerts.length !== 1 ? 's' : '' }}</strong>
        require review
      </div>
    </div>

    <!-- Tabs -->
    <div class="spread-ss__tabs">
      <button
        class="spread-ss__tab"
        :class="{ 'spread-ss__tab--active': activeView === 'form' }"
        @click="activeView = 'form'; resetForm()"
      >
        {{ editingAlertId ? 'Edit Alert' : 'New Alert' }}
      </button>
      <button
        class="spread-ss__tab"
        :class="{ 'spread-ss__tab--active': activeView === 'history' }"
        @click="activeView = 'history'"
      >
        Alert History
        <span v-if="alerts.length > 0" class="spread-ss__tab-count">{{ alerts.length }}</span>
      </button>
    </div>

    <!-- Alert form -->
    <div v-if="activeView === 'form'" class="spread-ss__panel">
      <div class="spread-ss__form-grid">
        <!-- Headline -->
        <div class="spread-ss__field spread-ss__field--full">
          <label class="spread-ss__label">Headline <span class="spread-ss__required">*</span></label>
          <input
            v-model="form.headline"
            class="spread-ss__input"
            type="text"
            placeholder="e.g. Payment processing delay"
            maxlength="200"
            :disabled="saving"
          />
        </div>

        <!-- Status type & severity -->
        <div class="spread-ss__field">
          <label class="spread-ss__label">Status type <span class="spread-ss__required">*</span></label>
          <select v-model="form.status_type" class="spread-ss__select" :disabled="saving">
            <option value="investigating">Investigating</option>
            <option value="identified">Identified</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <div class="spread-ss__field">
          <label class="spread-ss__label">Severity <span class="spread-ss__required">*</span></label>
          <select v-model="form.severity" class="spread-ss__select" :disabled="saving">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <!-- Affected services -->
        <div class="spread-ss__field spread-ss__field--full">
          <label class="spread-ss__label">Affected services</label>
          <input
            v-model="affectedServicesInput"
            class="spread-ss__input"
            type="text"
            placeholder="checkout, payments, delivery (comma-separated)"
            :disabled="saving"
          />
        </div>

        <!-- Message body -->
        <div class="spread-ss__field spread-ss__field--full">
          <label class="spread-ss__label">Message body <span class="spread-ss__required">*</span></label>
          <textarea
            v-model="form.message_body"
            class="spread-ss__textarea"
            placeholder="Describe the issue and its impact on users..."
            rows="4"
            maxlength="5000"
            :disabled="saving"
          ></textarea>
        </div>

        <!-- Impact description -->
        <div class="spread-ss__field spread-ss__field--full">
          <label class="spread-ss__label">Impact description</label>
          <textarea
            v-model="form.impact_description"
            class="spread-ss__textarea spread-ss__textarea--sm"
            placeholder="User-facing impact summary..."
            rows="2"
            maxlength="2000"
            :disabled="saving"
          ></textarea>
        </div>

        <!-- Times -->
        <div class="spread-ss__field">
          <label class="spread-ss__label">Start time</label>
          <input
            v-model="form.start_time"
            class="spread-ss__input"
            type="datetime-local"
            :disabled="saving"
          />
        </div>

        <div class="spread-ss__field">
          <label class="spread-ss__label">Expected resolution</label>
          <input
            v-model="form.expected_resolution"
            class="spread-ss__input"
            type="datetime-local"
            :disabled="saving"
          />
        </div>

        <!-- Recipient scope -->
        <div class="spread-ss__field">
          <label class="spread-ss__label">Recipients</label>
          <select v-model="form.recipient_scope" class="spread-ss__select" :disabled="saving">
            <option value="all_active">All active members + team</option>
            <option value="internal_only">Internal team only</option>
            <option value="all_contacts">All contacts</option>
          </select>
        </div>
      </div>

      <!-- Form actions -->
      <div class="spread-ss__form-actions">
        <button
          class="spread-ss__btn spread-ss__btn--outline"
          :disabled="saving || !isFormValid"
          @click="saveDraft"
        >
          <span v-if="saving && savingAction === 'draft'" class="spread-ss__spinner spread-ss__spinner--sm"></span>
          <span v-else>Save Draft</span>
        </button>
        <button
          class="spread-ss__btn spread-ss__btn--primary"
          :disabled="saving || !isFormValid"
          @click="confirmSend"
        >
          Approve &amp; Send
        </button>
        <button
          v-if="editingAlertId"
          class="spread-ss__btn spread-ss__btn--text"
          :disabled="saving"
          @click="resetForm"
        >
          Cancel edit
        </button>
      </div>
    </div>

    <!-- Alert history -->
    <div v-if="activeView === 'history'" class="spread-ss__panel">
      <!-- Filter row -->
      <div class="spread-ss__filter-row">
        <select v-model="filterStatus" class="spread-ss__select spread-ss__select--sm" @change="loadAlerts">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
          <option value="resolved">Resolved</option>
        </select>
        <select v-model="filterSeverity" class="spread-ss__select spread-ss__select--sm" @change="loadAlerts">
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="spread-ss__loading">
        <span class="spread-ss__spinner"></span>
      </div>

      <!-- Alert list -->
      <div v-else-if="alerts.length > 0" class="spread-ss__alert-list">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="spread-ss__alert-card"
        >
          <div class="spread-ss__alert-header">
            <div class="spread-ss__alert-title-row">
              <h3 class="spread-ss__alert-title">{{ alert.headline }}</h3>
              <div class="spread-ss__alert-badges">
                <span
                  class="spread-ss__badge"
                  :class="'spread-ss__badge--' + alert.severity"
                >
                  {{ alert.severity }}
                </span>
                <span
                  class="spread-ss__badge"
                  :class="'spread-ss__badge--status-' + alert.status"
                >
                  {{ alert.status }}
                </span>
                <span
                  v-if="alert.source === 'auto_detect'"
                  class="spread-ss__badge spread-ss__badge--auto"
                >
                  Auto
                </span>
              </div>
            </div>
            <p class="spread-ss__alert-meta">
              {{ alert.status_type }} &middot;
              {{ formatDate(alert.created_at) }}
              <template v-if="alert.sent_at"> &middot; Sent {{ formatDate(alert.sent_at) }}</template>
              <template v-if="alert.resolved_at"> &middot; Resolved {{ formatDate(alert.resolved_at) }}</template>
            </p>
          </div>

          <p class="spread-ss__alert-body">{{ truncate(alert.message_body, 200) }}</p>

          <div v-if="alert.affected_services && alert.affected_services.length > 0" class="spread-ss__alert-services">
            <span
              v-for="svc in alert.affected_services"
              :key="svc"
              class="spread-ss__service-tag"
            >
              {{ svc }}
            </span>
          </div>

          <!-- Card actions -->
          <div class="spread-ss__alert-actions">
            <button
              v-if="alert.status === 'draft' || alert.status === 'approved'"
              class="spread-ss__btn spread-ss__btn--sm spread-ss__btn--outline"
              @click="editAlert(alert)"
            >
              Edit
            </button>
            <button
              v-if="alert.status === 'draft' || alert.status === 'approved'"
              class="spread-ss__btn spread-ss__btn--sm spread-ss__btn--primary"
              :disabled="actionLoading === alert.id"
              @click="confirmSendExisting(alert)"
            >
              <span v-if="actionLoading === alert.id && actionType === 'send'" class="spread-ss__spinner spread-ss__spinner--xs spread-ss__spinner--white"></span>
              <span v-else>Send</span>
            </button>
            <button
              v-if="alert.status === 'sent'"
              class="spread-ss__btn spread-ss__btn--sm spread-ss__btn--success"
              :disabled="actionLoading === alert.id"
              @click="confirmResolve(alert)"
            >
              <span v-if="actionLoading === alert.id && actionType === 'resolve'" class="spread-ss__spinner spread-ss__spinner--xs spread-ss__spinner--white"></span>
              <span v-else>Resolve</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="spread-ss__empty">
        <p class="spread-ss__empty-text">No alerts found.</p>
      </div>
    </div>

    <!-- Confirmation modal -->
    <div v-if="showConfirm" class="spread-ss__overlay" @click.self="showConfirm = false">
      <div class="spread-ss__modal">
        <h3 class="spread-ss__modal-title">{{ confirmTitle }}</h3>
        <p class="spread-ss__modal-text" v-html="confirmMessage"></p>
        <div v-if="confirmAction === 'resolve'" class="spread-ss__modal-option">
          <label class="spread-ss__checkbox-label">
            <input v-model="sendFollowUp" type="checkbox" />
            <span>Send resolution follow-up email</span>
          </label>
        </div>
        <div class="spread-ss__modal-actions">
          <button
            class="spread-ss__btn"
            :class="confirmAction === 'resolve' ? 'spread-ss__btn--success' : 'spread-ss__btn--primary'"
            :disabled="actionLoading"
            @click="executeConfirmedAction"
          >
            <span v-if="actionLoading" class="spread-ss__spinner spread-ss__spinner--sm spread-ss__spinner--white"></span>
            <span v-else>{{ confirmButton }}</span>
          </button>
          <button class="spread-ss__btn spread-ss__btn--outline" :disabled="actionLoading" @click="showConfirm = false">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toastMsg" class="spread-ss__toast" :class="'spread-ss__toast--' + toastType">
      {{ toastMsg }}
    </div>
  </div>
</template>

<script>
/* ------------------------------------------------------------------ */
/*  Inline Supabase client                                            */
/* ------------------------------------------------------------------ */
function createSpreadClient(url, anonKey, token) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  return {
    async rpc(fnName, params = {}) {
      const res = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw Object.assign(new Error(e.message || res.statusText), { status: res.status, code: e.code });
      }
      return res.json();
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */
const MOCK_ALERTS = [
  {
    id: 'a1', headline: 'Payment gateway intermittent errors', message_body: 'Some checkout sessions are failing due to upstream Stripe connectivity issues.',
    status_type: 'investigating', affected_services: ['checkout', 'payments'], severity: 'high',
    source: 'auto_detect', status: 'draft', recipient_scope: 'all_active',
    created_at: '2026-03-15T09:30:00Z', sent_at: null, resolved_at: null,
  },
  {
    id: 'a2', headline: 'Scheduled maintenance — delivery routing', message_body: 'Planned maintenance window for delivery route optimization service.',
    status_type: 'maintenance', affected_services: ['delivery'], severity: 'low',
    source: 'manual', status: 'sent', recipient_scope: 'all_active',
    created_at: '2026-03-14T14:00:00Z', sent_at: '2026-03-14T14:05:00Z', resolved_at: null,
  },
  {
    id: 'a3', headline: 'Sync pipeline recovered', message_body: 'Geo data sync pipeline has been restored after overnight stall.',
    status_type: 'resolved', affected_services: ['sync', 'data-pipeline'], severity: 'medium',
    source: 'auto_detect', status: 'resolved', recipient_scope: 'internal_only',
    created_at: '2026-03-13T06:00:00Z', sent_at: '2026-03-13T06:10:00Z', resolved_at: '2026-03-13T08:30:00Z',
  },
];

export default {
  props: {
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    content: { type: Object, required: true },
    wwFrontState: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
  },
  emits: ['trigger-event', 'update:content'],

  data() {
    return {
      permissionGranted: null,
      activeView: 'history',
      alerts: [],
      loading: false,
      saving: false,
      savingAction: '',
      actionLoading: null,
      actionType: '',
      filterStatus: '',
      filterSeverity: '',
      editingAlertId: null,
      form: this.emptyForm(),
      affectedServicesInput: '',
      showConfirm: false,
      confirmTitle: '',
      confirmMessage: '',
      confirmButton: '',
      confirmAction: '',
      confirmAlertId: null,
      sendFollowUp: true,
      toastMsg: '',
      toastType: 'success',
    };
  },

  computed: {
    isEditorMode() {
      /* wwEditor:start */
      return !!this.wwEditorState;
      /* wwEditor:end */
      return false; // eslint-disable-line no-unreachable
    },

    autoDraftAlerts() {
      return this.alerts.filter(a => a.source === 'auto_detect' && a.status === 'draft');
    },

    isFormValid() {
      return !!this.form.headline?.trim() && !!this.form.message_body?.trim();
    },
  },

  watch: {
    'content.refreshTrigger'() {
      this.loadAlerts();
    },
    'content.accessToken': { immediate: true, handler(token) { if (token) this.checkAdminPermission(); else this.permissionGranted = false; } },
  },

  mounted() {
    this.loadAlerts();
  },

  methods: {
    async checkAdminPermission() {
      const t = this.content?.accessToken, u = this.content?.userId,
            url = this.content?.supabaseUrl, k = this.content?.supabaseAnonKey;
      if (!t || !u || !url || !k) { this.permissionGranted = false; return; }
      try {
        const ALLOWED = ['founder', 'platform_admin'];
        const results = await Promise.all(ALLOWED.map(role =>
          fetch(`${url}/rest/v1/rpc/has_role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: k, Authorization: `Bearer ${t}` },
            body: JSON.stringify({ p_user_id: u, p_role_key: role }),
          }).then(r => r.ok ? r.json() : false)
        ));
        this.permissionGranted = results.some(Boolean);
      } catch { this.permissionGranted = false; }
    },

    client() {
      return createSpreadClient(
        this.content?.supabaseUrl,
        this.content?.supabaseAnonKey,
        this.content?.accessToken,
      );
    },

    emptyForm() {
      return {
        headline: '',
        message_body: '',
        status_type: 'investigating',
        severity: 'medium',
        impact_description: '',
        start_time: '',
        expected_resolution: '',
        recipient_scope: 'all_active',
      };
    },

    resetForm() {
      this.editingAlertId = null;
      this.form = this.emptyForm();
      this.affectedServicesInput = '';
      this.activeView = 'form';
    },

    editAlert(alert) {
      this.editingAlertId = alert.id;
      this.form = {
        headline: alert.headline,
        message_body: alert.message_body,
        status_type: alert.status_type,
        severity: alert.severity,
        impact_description: alert.impact_description || '',
        start_time: alert.start_time ? this.toLocalInput(alert.start_time) : '',
        expected_resolution: alert.expected_resolution ? this.toLocalInput(alert.expected_resolution) : '',
        recipient_scope: alert.recipient_scope || 'all_active',
      };
      this.affectedServicesInput = (alert.affected_services || []).join(', ');
      this.activeView = 'form';
    },

    toLocalInput(isoStr) {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    formatDate(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    },

    truncate(str, len) {
      if (!str) return '';
      return str.length > len ? str.slice(0, len) + '...' : str;
    },

    parsedAffectedServices() {
      if (!this.affectedServicesInput.trim()) return [];
      return this.affectedServicesInput.split(',').map(s => s.trim()).filter(Boolean);
    },

    async loadAlerts() {
      /* wwEditor:start */
      if (this.isEditorMode) {
        this.alerts = MOCK_ALERTS;
        return;
      }
      /* wwEditor:end */

      this.loading = true;
      try {
        const result = await this.client().rpc('get_admin_service_alerts', {
          p_status: this.filterStatus || null,
          p_severity: this.filterSeverity || null,
          p_limit: 100,
          p_offset: 0,
        });
        this.alerts = result?.alerts || [];
      } catch (err) {
        this.showToast(err.message || 'Failed to load alerts', 'error');
        this.$emit('trigger-event', {
          name: 'servicestatus:error',
          event: { message: err.message || 'Failed to load alerts' },
        });
      } finally {
        this.loading = false;
      }
    },

    async saveDraft() {
      this.saving = true;
      this.savingAction = 'draft';
      try {
        const alertId = await this.client().rpc('upsert_service_alert', {
          p_id: this.editingAlertId || null,
          p_headline: this.form.headline,
          p_message_body: this.form.message_body,
          p_status_type: this.form.status_type,
          p_affected_services: this.parsedAffectedServices(),
          p_start_time: this.form.start_time ? new Date(this.form.start_time).toISOString() : new Date().toISOString(),
          p_expected_resolution: this.form.expected_resolution ? new Date(this.form.expected_resolution).toISOString() : null,
          p_impact_description: this.form.impact_description || null,
          p_severity: this.form.severity,
          p_recipient_scope: this.form.recipient_scope,
        });

        this.showToast('Draft saved', 'success');
        this.$emit('trigger-event', {
          name: 'servicestatus:saved',
          event: { alertId },
        });
        this.resetForm();
        this.activeView = 'history';
        await this.loadAlerts();
      } catch (err) {
        this.showToast(err.message || 'Failed to save draft', 'error');
        this.$emit('trigger-event', {
          name: 'servicestatus:error',
          event: { message: err.message },
        });
      } finally {
        this.saving = false;
        this.savingAction = '';
      }
    },

    confirmSend() {
      if (!this.isFormValid) return;
      this.confirmTitle = 'Approve & Send Alert';
      this.confirmMessage = `This will <strong>save and immediately send</strong> a service alert with headline "<strong>${this.escapeHtml(this.form.headline)}</strong>" to <strong>${this.form.recipient_scope.replace('_', ' ')}</strong>. This cannot be undone.`;
      this.confirmButton = 'Approve & Send';
      this.confirmAction = 'send-new';
      this.showConfirm = true;
    },

    confirmSendExisting(alert) {
      this.confirmTitle = 'Send Alert';
      this.confirmMessage = `Send "<strong>${this.escapeHtml(alert.headline)}</strong>" to <strong>${(alert.recipient_scope || 'all_active').replace('_', ' ')}</strong>? This cannot be undone.`;
      this.confirmButton = 'Send Now';
      this.confirmAction = 'send-existing';
      this.confirmAlertId = alert.id;
      this.showConfirm = true;
    },

    confirmResolve(alert) {
      this.confirmTitle = 'Resolve Alert';
      this.confirmMessage = `Mark "<strong>${this.escapeHtml(alert.headline)}</strong>" as resolved?`;
      this.confirmButton = 'Mark Resolved';
      this.confirmAction = 'resolve';
      this.confirmAlertId = alert.id;
      this.sendFollowUp = true;
      this.showConfirm = true;
    },

    async executeConfirmedAction() {
      if (this.confirmAction === 'send-new') {
        await this.doSaveAndSend();
      } else if (this.confirmAction === 'send-existing') {
        await this.doSendExisting();
      } else if (this.confirmAction === 'resolve') {
        await this.doResolve();
      }
    },

    async doSaveAndSend() {
      this.saving = true;
      this.savingAction = 'send';
      try {
        // First save/upsert
        const alertId = await this.client().rpc('upsert_service_alert', {
          p_id: this.editingAlertId || null,
          p_headline: this.form.headline,
          p_message_body: this.form.message_body,
          p_status_type: this.form.status_type,
          p_affected_services: this.parsedAffectedServices(),
          p_start_time: this.form.start_time ? new Date(this.form.start_time).toISOString() : new Date().toISOString(),
          p_expected_resolution: this.form.expected_resolution ? new Date(this.form.expected_resolution).toISOString() : null,
          p_impact_description: this.form.impact_description || null,
          p_severity: this.form.severity,
          p_recipient_scope: this.form.recipient_scope,
        });

        // Then approve & send
        await this.client().rpc('approve_and_send_service_alert', {
          p_alert_id: alertId,
        });

        this.showConfirm = false;
        this.showToast('Alert sent successfully', 'success');
        this.$emit('trigger-event', {
          name: 'servicestatus:sent',
          event: { alertId, headline: this.form.headline },
        });
        this.resetForm();
        this.activeView = 'history';
        await this.loadAlerts();
      } catch (err) {
        this.showConfirm = false;
        this.showToast(err.message || 'Failed to send alert', 'error');
        this.$emit('trigger-event', {
          name: 'servicestatus:error',
          event: { message: err.message },
        });
      } finally {
        this.saving = false;
        this.savingAction = '';
      }
    },

    async doSendExisting() {
      this.actionLoading = this.confirmAlertId;
      this.actionType = 'send';
      try {
        await this.client().rpc('approve_and_send_service_alert', {
          p_alert_id: this.confirmAlertId,
        });

        this.showConfirm = false;
        const alert = this.alerts.find(a => a.id === this.confirmAlertId);
        this.showToast('Alert sent', 'success');
        this.$emit('trigger-event', {
          name: 'servicestatus:sent',
          event: { alertId: this.confirmAlertId, headline: alert?.headline || '' },
        });
        await this.loadAlerts();
      } catch (err) {
        this.showConfirm = false;
        this.showToast(err.message || 'Failed to send', 'error');
        this.$emit('trigger-event', {
          name: 'servicestatus:error',
          event: { message: err.message },
        });
      } finally {
        this.actionLoading = null;
        this.actionType = '';
      }
    },

    async doResolve() {
      this.actionLoading = this.confirmAlertId;
      this.actionType = 'resolve';
      try {
        await this.client().rpc('resolve_service_alert', {
          p_alert_id: this.confirmAlertId,
          p_send_follow_up: this.sendFollowUp,
        });

        this.showConfirm = false;
        this.showToast('Alert resolved', 'success');
        this.$emit('trigger-event', {
          name: 'servicestatus:resolved',
          event: { alertId: this.confirmAlertId },
        });
        await this.loadAlerts();
      } catch (err) {
        this.showConfirm = false;
        this.showToast(err.message || 'Failed to resolve', 'error');
        this.$emit('trigger-event', {
          name: 'servicestatus:error',
          event: { message: err.message },
        });
      } finally {
        this.actionLoading = null;
        this.actionType = '';
      }
    },

    showToast(msg, type = 'success') {
      this.toastMsg = msg;
      this.toastType = type;
      if (type === 'error') {
        this.$emit('trigger-event', {
          name: 'servicestatus:error',
          event: { message: msg },
        });
      }
      setTimeout(() => { this.toastMsg = ''; }, 4000);
    },

    escapeHtml(str) {
      const doc = typeof wwLib !== 'undefined' ? wwLib.getFrontDocument() : null;
      const el = doc ? doc.createElement('div') : null;
      if (el) { el.textContent = str; return el.innerHTML; }
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
  },
};
</script>

<style scoped>
/* ------------------------------------------------------------------ */
/*  Tokens                                                            */
/* ------------------------------------------------------------------ */
.spread-ss {
  --spread-primary: #4B162D;
  --spread-accent: #CE6632;
  --spread-accent-hover: #B5572B;
  --spread-cream: #FBFAF8;
  --spread-black: #141414;
  --spread-dark-grey: #2B2B2B;
  --spread-mid-grey: #4B5563;
  --spread-light-grey: #6B7280;
  --spread-border: #E5E7EB;
  --spread-border: #F3EADF;
  --spread-border-outer: #EFE7DE;
  --spread-error: #D14343;
  --spread-success: #16A34A;
  --spread-warning: #D97706;
  --spread-info: #2563EB;
  --spread-radius: 12px;
  --spread-radius-lg: 16px;

  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--spread-black);
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  position: relative;
}

/* ---- Header ---- */
.spread-ss__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.spread-ss__title {
  font-size: 22px;
  font-weight: 900;
  color: var(--spread-primary);
  margin: 0;
  line-height: 1.25;
}

/* ---- Auto-detect banner ---- */
.spread-ss__auto-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: var(--spread-radius);
  padding: 12px 16px;
  margin-bottom: 16px;
}

.spread-ss__auto-banner-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.spread-ss__auto-banner-content {
  font-size: 13px;
  color: var(--spread-dark-grey);
  line-height: 1.5;
}

/* ---- Tabs ---- */
.spread-ss__tabs {
  display: flex;
  border-bottom: 2px solid var(--spread-border);
  margin-bottom: 20px;
}

.spread-ss__tab {
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  color: var(--spread-mid-grey);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.spread-ss__tab:hover { color: var(--spread-dark-grey); }

.spread-ss__tab--active {
  color: var(--spread-accent);
  border-bottom-color: var(--spread-accent);
}

.spread-ss__tab-count {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--spread-accent);
  color: #fff;
}

/* ---- Panel ---- */
.spread-ss__panel {
  background: #fff;
  border: 1px solid var(--spread-border-outer);
  border-radius: var(--spread-radius-lg);
  padding: 20px;
}

/* ---- Form ---- */
.spread-ss__form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.spread-ss__field--full {
  grid-column: 1 / -1;
}

.spread-ss__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--spread-mid-grey);
  margin-bottom: 6px;
}

.spread-ss__required {
  color: var(--spread-error);
}

.spread-ss__input,
.spread-ss__select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--spread-border);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--spread-dark-grey);
  background: var(--spread-cream);
  box-sizing: border-box;
}

.spread-ss__input:focus,
.spread-ss__select:focus,
.spread-ss__textarea:focus {
  outline: none;
  border-color: var(--spread-accent);
}

.spread-ss__select--sm {
  max-width: 180px;
}

.spread-ss__textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--spread-border);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--spread-dark-grey);
  background: var(--spread-cream);
  resize: vertical;
  box-sizing: border-box;
}

.spread-ss__textarea--sm {
  min-height: 50px;
}

/* ---- Form actions ---- */
.spread-ss__form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  align-items: center;
}

/* ---- Filter ---- */
.spread-ss__filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

/* ---- Alert list ---- */
.spread-ss__alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spread-ss__alert-card {
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius);
  padding: 16px;
  background: var(--spread-cream);
}

.spread-ss__alert-header {
  margin-bottom: 8px;
}

.spread-ss__alert-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.spread-ss__alert-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--spread-black);
  margin: 0;
  line-height: 1.3;
}

.spread-ss__alert-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.spread-ss__badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.spread-ss__badge--low { background: #dbeafe; color: var(--spread-info); }
.spread-ss__badge--medium { background: #fef3c7; color: var(--spread-warning); }
.spread-ss__badge--high { background: #fed7aa; color: #c2410c; }
.spread-ss__badge--critical { background: #fee2e2; color: var(--spread-error); }

.spread-ss__badge--status-draft { background: #f3f4f6; color: var(--spread-light-grey); }
.spread-ss__badge--status-approved { background: #dbeafe; color: var(--spread-info); }
.spread-ss__badge--status-sent { background: #dcfce7; color: var(--spread-success); }
.spread-ss__badge--status-resolved { background: #e0e7ff; color: #4338ca; }

.spread-ss__badge--auto { background: #fef3c7; color: var(--spread-warning); }

.spread-ss__alert-meta {
  font-size: 12px;
  color: var(--spread-mid-grey);
  margin: 0;
  line-height: 1.5;
}

.spread-ss__alert-body {
  font-size: 13px;
  color: var(--spread-dark-grey);
  margin: 0 0 10px;
  line-height: 1.6;
}

.spread-ss__alert-services {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.spread-ss__service-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e0e7ff;
  color: #4338ca;
}

.spread-ss__alert-actions {
  display: flex;
  gap: 8px;
  border-top: 1px solid var(--spread-border);
  padding-top: 10px;
}

/* ---- Buttons ---- */
.spread-ss__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--spread-radius);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  border: none;
  letter-spacing: 0.1px;
}

.spread-ss__btn--primary { background: var(--spread-accent); color: #fff; }
.spread-ss__btn--primary:hover:not(:disabled) { background: var(--spread-accent-hover); }

.spread-ss__btn--success { background: var(--spread-success); color: #fff; }
.spread-ss__btn--success:hover:not(:disabled) { background: #15803d; }

.spread-ss__btn--outline {
  background: #fff;
  color: var(--spread-accent);
  border: 1px solid var(--spread-accent);
}
.spread-ss__btn--outline:hover:not(:disabled) { background: #fdf4ef; }

.spread-ss__btn--text {
  background: none;
  color: var(--spread-mid-grey);
  padding: 10px 8px;
}
.spread-ss__btn--text:hover { color: var(--spread-dark-grey); }

.spread-ss__btn--sm { padding: 7px 12px; font-size: 12px; }

.spread-ss__btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---- Spinner ---- */
.spread-ss__spinner {
  width: 18px; height: 18px;
  border: 2px solid var(--spread-border);
  border-top-color: var(--spread-accent);
  border-radius: 50%;
  animation: spread-ss-spin 0.6s linear infinite;
  display: inline-block;
}
.spread-ss__spinner--sm { width: 14px; height: 14px; }
.spread-ss__spinner--xs { width: 12px; height: 12px; }
.spread-ss__spinner--white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }

@keyframes spread-ss-spin { to { transform: rotate(360deg); } }

/* ---- Modal ---- */
.spread-ss__overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}

.spread-ss__modal {
  background: #fff;
  border-radius: var(--spread-radius-lg);
  padding: 28px;
  max-width: 460px; width: 90%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}

.spread-ss__modal-title { font-size: 18px; font-weight: 800; color: var(--spread-black); margin: 0 0 12px; }
.spread-ss__modal-text { font-size: 14px; color: var(--spread-dark-grey); line-height: 1.6; margin: 0 0 16px; }
.spread-ss__modal-option { margin-bottom: 16px; }

.spread-ss__checkbox-label {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; font-size: 13px; color: var(--spread-dark-grey);
}
.spread-ss__checkbox-label input[type="checkbox"] {
  width: 16px; height: 16px; accent-color: var(--spread-accent); cursor: pointer;
}

.spread-ss__modal-actions { display: flex; gap: 10px; }

/* ---- Toast ---- */
.spread-ss__toast {
  position: fixed; bottom: 24px; right: 24px;
  padding: 12px 20px; border-radius: var(--spread-radius);
  font-size: 13px; font-weight: 600; z-index: 10000;
  animation: spread-ss-fadein 0.2s ease;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.spread-ss__toast--success { background: #dcfce7; color: var(--spread-success); border: 1px solid #bbf7d0; }
.spread-ss__toast--error { background: #fef2f2; color: var(--spread-error); border: 1px solid #fecaca; }

@keyframes spread-ss-fadein {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Loading ---- */
.spread-ss__loading {
  display: flex; justify-content: center; padding: 32px;
}

/* ---- Empty ---- */
.spread-ss__empty { text-align: center; padding: 32px 16px; }
.spread-ss__empty-text { color: var(--spread-mid-grey); font-size: 14px; margin: 0; }

/* ---- Responsive ---- */
@media (max-width: 767px) {
  .spread-ss { padding: 16px; }
  .spread-ss__title { font-size: 18px; }

  .spread-ss__form-grid {
    grid-template-columns: 1fr;
  }

  .spread-ss__form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .spread-ss__form-actions .spread-ss__btn {
    width: 100%;
    justify-content: center;
  }

  .spread-ss__filter-row {
    flex-direction: column;
  }

  .spread-ss__select--sm {
    max-width: 100%;
  }

  .spread-ss__alert-title-row {
    flex-direction: column;
  }

  .spread-ss__modal { width: 95%; padding: 20px; }
  .spread-ss__modal-actions { flex-direction: column; }
  .spread-ss__toast { left: 16px; right: 16px; bottom: 16px; }
}

@media (max-width: 479px) {
  .spread-ss { padding: 12px; }
  .spread-ss__title { font-size: 16px; }
  .spread-ss__modal { width: 100%; border-radius: 0; bottom: 0; top: auto; transform: none; }
}
@media (min-width: 480px) {
  .spread-ss { padding: 18px; }
}
@media (min-width: 1024px) {
  .spread-ss { padding: 24px 32px; }
}
@media (min-width: 1280px) {
  .spread-ss { padding: 28px 40px; }
}
@keyframes spread-perm-spin { to { transform: rotate(360deg); } }
</style>
