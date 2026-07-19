import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, FileImage, Landmark, Lock, Save, ShieldCheck, User } from 'lucide-react';

const emptyDetails = {
  pan_name: '', pan_number: '', aadhaar_number: '', email: '', mobile_number: '',
  dob: '', gender: '', marital_status: '', father_name: '', mother_name: '',
  occupation: '', income: '', address: '', city: '', state: '', pincode: '',
  bank_name: '', account_number: '', ifsc_code: '', account_holder: ''
};

async function readPayload(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

function Field({ label, value, onChange, locked = false, type = 'text' }) {
  const inputType = locked && !value ? 'text' : type;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
        {label}{locked && <Lock size={10} />}
      </span>
      <input type={inputType} value={value || ''} placeholder={locked ? 'Not provided' : `Enter ${label.toLowerCase()}`} onChange={onChange} disabled={locked} style={{
        width: '100%', boxSizing: 'border-box', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', outline: 'none',
        color: locked ? 'var(--color-text-muted)' : 'var(--color-text-main)',
        background: locked ? 'var(--color-white-0.02)' : 'var(--color-white-0.04)',
        border: `1px solid ${locked ? 'var(--color-white-0.04)' : 'var(--color-white-0.08)'}`,
        cursor: locked ? 'not-allowed' : 'text'
      }} />
    </label>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section style={{ background: 'var(--color-bg-panel-0.95)', border: '1px solid var(--color-white-0.07)', borderRadius: '14px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Icon size={17} color="var(--color-accent)" />
        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-main)' }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function PersonalInformation() {
  const [details, setDetails] = useState(emptyDetails);
  const [savedDetails, setSavedDetails] = useState(emptyDetails);
  const [status, setStatus] = useState('NOT_STARTED');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const approved = status === 'APPROVED';

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('capitalup-access-token');
        const base = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${base}/kyc`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = await readPayload(response);
        if (!response.ok || !payload.data) throw new Error(payload.message || 'KYC information is not available yet.');
        const loadedDetails = { ...emptyDetails, ...payload.data, dob: payload.data.dob?.slice(0, 10) || '' };
        setDetails(loadedDetails);
        setSavedDetails(loadedDetails);
        setStatus(payload.data.kyc_status || 'NOT_STARTED');
      } catch (error) { setMessage(error.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const change = (key) => (event) => setDetails((current) => ({ ...current, [key]: event.target.value }));

  const editableKeys = approved
    ? ['mother_name', 'gender', 'marital_status', 'occupation', 'income', 'address', 'city', 'state', 'pincode', 'bank_name', 'account_holder', 'account_number', 'ifsc_code']
    : ['pan_name', 'dob', 'father_name', 'mother_name', 'gender', 'marital_status', 'occupation', 'income', 'address', 'city', 'state', 'pincode', 'pan_number', 'aadhaar_number', 'bank_name', 'account_holder', 'account_number', 'ifsc_code'];
  const changedKeys = editableKeys.filter((key) => String(details[key] ?? '') !== String(savedDetails[key] ?? ''));
  const hasChanges = changedKeys.length > 0;

  const save = async () => {
    if (!hasChanges) {
      window.dispatchEvent(new CustomEvent('changeTab', { detail: 'settings' }));
      return;
    }
    setSaving(true); setMessage('');
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const base = import.meta.env.VITE_API_URL || '';
      const apiFields = {
        mother_name: 'mother_name', gender: 'gender', marital_status: 'marital_status',
        occupation: 'occupation', income: 'annual_income', address: 'address', city: 'city',
        state: 'state', pincode: 'pincode', bank_name: 'bank_name', account_holder: 'account_holder',
        account_number: 'bank_account_number', ifsc_code: 'bank_ifsc', pan_name: 'pan_full_name',
        dob: 'date_of_birth', father_name: 'father_name', pan_number: 'pan_number',
        aadhaar_number: 'aadhaar_number'
      };
      const body = changedKeys.reduce((result, key) => {
        const value = key === 'ifsc_code' || key === 'pan_number' ? details[key]?.toUpperCase() : details[key];
        result[apiFields[key]] = value;
        return result;
      }, {});
      const response = await fetch(`${base}/profile`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || payload.errors?.[0]?.message || 'Unable to save changes.');
      const normalizedDetails = {
        ...details,
        ifsc_code: details.ifsc_code?.toUpperCase(),
        pan_number: details.pan_number?.toUpperCase()
      };
      setDetails(normalizedDetails);
      setSavedDetails(normalizedDetails);
      setMessage('Personal information updated successfully.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: 'var(--color-text-muted)', padding: '32px' }}>Loading personal information…</div>;

  const grid = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' };
  const documents = [
    ['PAN card', details.pan_document_url], ['Aadhaar front', details.aadhaar_front_url],
    ['Aadhaar back', details.aadhaar_back_url], ['Signature', details.signature_document_url]
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'settings' }))} style={{ background: 'none', border: 0, color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', gap: '6px', padding: 0, marginBottom: '10px' }}><ArrowLeft size={14} /> Back to settings</button>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Identity & Account</div>
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', margin: 0 }}>Personal Information</h1>
      </div>

      <div style={{ borderRadius: '12px', padding: '14px 18px', background: approved ? 'var(--color-success-0.08)' : 'var(--color-warning-0.08)', border: `1px solid ${approved ? 'var(--color-success-0.2)' : 'var(--color-warning-0.2)'}`, display: 'flex', alignItems: 'center', gap: '10px', color: approved ? 'var(--color-success)' : 'var(--color-warning)', fontSize: '13px' }}>
        {approved ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
        {approved ? 'KYC approved. Verified identity, PAN, Aadhaar, email and mobile details are locked.' : 'KYC is not approved yet. Your submitted details are shown below.'}
      </div>

      {message && <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--color-white-0.04)', color: message.includes('successfully') ? 'var(--color-success)' : 'var(--color-error)', fontSize: '13px' }}>{message}</div>}

      <Section icon={User} title="Personal details">
        <div style={grid} className="max-md:grid-cols-1">
          <Field label="Full name (as per PAN)" value={details.pan_name} onChange={change('pan_name')} locked={approved} />
          <Field label="Date of birth" value={details.dob} type="date" onChange={change('dob')} locked={approved} />
          <Field label="Father's name" value={details.father_name} onChange={change('father_name')} locked={approved} />
          <Field label="Mother's name" value={details.mother_name} onChange={change('mother_name')} />
          <Field label="Gender" value={details.gender} onChange={change('gender')} />
          <Field label="Marital status" value={details.marital_status} onChange={change('marital_status')} />
          <Field label="Occupation" value={details.occupation} onChange={change('occupation')} />
          <Field label="Annual income" value={details.income} onChange={change('income')} />
          <Field label="Registered email" value={details.email} locked />
          <Field label="Registered mobile number" value={details.mobile_number} locked />
        </div>
      </Section>

      <Section icon={CreditCard} title="Verified identity numbers">
        <div style={grid} className="max-md:grid-cols-1">
          <Field label="PAN number" value={details.pan_number} onChange={change('pan_number')} locked={approved} />
          <Field label="Aadhaar number" value={details.aadhaar_number} onChange={change('aadhaar_number')} locked={approved} />
        </div>
      </Section>

      <Section icon={Landmark} title="Address & bank account">
        <div style={grid} className="max-md:grid-cols-1">
          <Field label="Address" value={details.address} onChange={change('address')} />
          <Field label="City" value={details.city} onChange={change('city')} />
          <Field label="State" value={details.state} onChange={change('state')} />
          <Field label="Pincode" value={details.pincode} onChange={change('pincode')} />
          <Field label="Bank name" value={details.bank_name} onChange={change('bank_name')} />
          <Field label="Account holder" value={details.account_holder} onChange={change('account_holder')} />
          <Field label="Account number" value={details.account_number} onChange={change('account_number')} />
          <Field label="IFSC code" value={details.ifsc_code} onChange={change('ifsc_code')} />
        </div>
      </Section>

      <Section icon={FileImage} title="Uploaded photographs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }} className="max-xl:grid-cols-2 max-md:grid-cols-1">
          {documents.map(([label, url]) => <div key={label} style={{ border: '1px solid var(--color-white-0.07)', borderRadius: '10px', overflow: 'hidden', background: 'var(--color-white-0.02)' }}>
            {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} /></a> : <div style={{ height: '150px', display: 'grid', placeItems: 'center', color: 'var(--color-text-dim)', fontSize: '12px' }}>Not uploaded</div>}
            <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-sub)' }}>{label}</div>
          </div>)}
        </div>
      </Section>

      <button
        onClick={save}
        disabled={saving}
        className="btn-glass-accent"
        style={{
          alignSelf: 'flex-end',
          borderRadius: '8px',
          padding: '11px 22px',
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {hasChanges ? <Save size={15} /> : <CheckCircle2 size={15} />}
        {saving ? 'Saving…' : hasChanges ? 'Save changes' : 'Done'}
      </button>
    </div>
  );
}
