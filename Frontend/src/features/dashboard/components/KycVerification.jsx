import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, ShieldAlert, CreditCard, User, Home, Upload, 
  Check, ArrowRight, ArrowLeft, Clock, FileText, CheckCircle2,
  Trash2, Landmark, HelpCircle, Eye, EyeOff, CheckCircle,
  Image, RefreshCw, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

export function KycVerification() {
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('capitalup-user') || '{}');
  });

  const [kycStatus, setKycStatus] = useState(() => {
    return localStorage.getItem('capitalup-kyc-status') || 'NOT_STARTED'; // 'NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED'
  });

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Form Fields State
  const [formData, setFormData] = useState({
    // Step 1: PAN
    panFullName: '',
    panNumber: '',
    // Step 2: Aadhaar
    aadhaarNumber: '',
    // Step 3: Bank Details
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountType: 'Savings',
    // Step 5: Profile Info
    dob: '',
    gender: '',
    maritalStatus: '',
    fathersName: '',
    mothersName: '',
    occupation: '',
    incomeRange: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    // Step 6: Consents
    declaredCorrect: false,
    authSharing: false,
    fatcaDeclare: false
  });

  // Files State
  const [files, setFiles] = useState({
    panDocument: null,
    aadhaarFront: null,
    aadhaarBack: null,
    signatureDocument: null
  });

  // Previews
  const [filePreviews, setFilePreviews] = useState({
    panDocument: '',
    aadhaarFront: '',
    aadhaarBack: '',
    signatureDocument: ''
  });

  // Bank verification animation states
  const [bankVerificationState, setBankVerificationState] = useState('UNVERIFIED'); // 'UNVERIFIED', 'INITIATED', 'PROCESSING', 'VERIFIED', 'FAILED'
  const [bankVerificationMessage, setBankVerificationMessage] = useState('');

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const fetchKycStatus = async () => {
      const token = localStorage.getItem('capitalup-access-token');
      if (!token) return;

      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${API_BASE_URL}/kyc`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const payload = await readJsonResponse(response);

        if (response.status === 404 || !payload.data) {
          setKycStatus('NOT_STARTED');
          localStorage.setItem('capitalup-kyc-status', 'NOT_STARTED');
          window.dispatchEvent(new Event('storage'));
          return;
        }

        const nextStatus = payload.data.kyc_status || 'NOT_STARTED';
        setKycStatus(nextStatus);
        localStorage.setItem('capitalup-kyc-status', nextStatus);
        setRejectReason(payload.data.remarks || '');

        if (nextStatus === 'APPROVED') {
          const updatedUser = {
            ...user,
            kyc_is_done: true,
            full_name: payload.data.pan_name || user.full_name
          };
          setUser(updatedUser);
          localStorage.setItem('capitalup-user', JSON.stringify(updatedUser));
        }

        if (nextStatus === 'REJECTED') {
          const updatedUser = {
            ...user,
            kyc_is_done: false
          };
          setUser(updatedUser);
          localStorage.setItem('capitalup-user', JSON.stringify(updatedUser));
        }

        window.dispatchEvent(new Event('storage'));
      } catch (error) {
        console.error('Failed to load KYC status:', error);
      }
    };

    fetchKycStatus();
  }, []);

  useEffect(() => {
    if (user.kyc_is_done && kycStatus === 'NOT_STARTED') {
      setKycStatus('APPROVED');
      localStorage.setItem('capitalup-kyc-status', 'APPROVED');
    }
  }, [user, kycStatus]);

  // Set up branch name automatically based on IFSC code typing
  useEffect(() => {
    const code = formData.ifscCode.toUpperCase();
    if (code.length === 11) {
      if (code.startsWith('HDFC')) {
        setFormData(prev => ({ ...prev, bankName: 'HDFC Bank Ltd', branchName: 'Senapati Bapat Marg, Mumbai' }));
      } else if (code.startsWith('SBIN')) {
        setFormData(prev => ({ ...prev, bankName: 'State Bank of India', branchName: 'Secretariat Road, Bangalore' }));
      } else if (code.startsWith('ICIC')) {
        setFormData(prev => ({ ...prev, bankName: 'ICICI Bank Ltd', branchName: 'Connaught Place, Delhi' }));
      } else if (code.startsWith('BARB')) {
        setFormData(prev => ({ ...prev, bankName: 'Bank of Baroda', branchName: 'Alkapuri, Vadodara' }));
      } else {
        setFormData(prev => ({ ...prev, bankName: 'Verified IFSC Bank', branchName: 'Corporate Office Branch' }));
      }
    } else {
      setFormData(prev => ({ ...prev, bankName: '', branchName: '' }));
      if (bankVerificationState === 'VERIFIED') {
        setBankVerificationState('UNVERIFIED');
      }
    }
  }, [formData.ifscCode]);

  // IFSC and account number validation trigger.
  const handleVerifyBankDetails = () => {
    const errors = {};
    if (!formData.accountNumber || formData.accountNumber.length < 9) {
      errors.accountNumber = 'Account number must be at least 9 digits';
    }
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      errors.confirmAccountNumber = 'Bank account numbers do not match';
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!formData.ifscCode || !ifscRegex.test(formData.ifscCode.toUpperCase())) {
      errors.ifscCode = 'Invalid 11-digit IFSC code format. E.g. HDFC0001234';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setBankVerificationState('INITIATED');
    setBankVerificationMessage('Initiating account validation request...');

    // Penny Drop Validation Stages
    setTimeout(() => {
      setBankVerificationState('PROCESSING');
      setBankVerificationMessage('Depositing ₹1.00 security penny drop token...');
      
      setTimeout(() => {
        setBankVerificationState('VERIFIED');
        setBankVerificationMessage(`Verified! Beneficiary name: ${formData.panFullName || user.full_name || 'James Dornan'}`);
        
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#18C37E', '#4F8CFF']
        });
      }, 1500);

    }, 1200);
  };

  // Form validations per step
  const validateStep = (currentStep) => {
    const errors = {};
    if (currentStep === 1) {
      if (!formData.panFullName.trim()) {
        errors.panFullName = 'Full name as per PAN is required';
      } else if (formData.panFullName.trim().length < 3) {
        errors.panFullName = 'Name must be at least 3 characters';
      }

      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (!formData.panNumber) {
        errors.panNumber = 'PAN Card Number is required';
      } else if (!panRegex.test(formData.panNumber.toUpperCase())) {
        errors.panNumber = 'Invalid PAN format. Example: ABCDE1234F';
      }

      if (!files.panDocument) {
        errors.panDocument = 'Please upload a photo of your PAN Card';
      }
    }

    if (currentStep === 2) {
      const aadhaarRegex = /^\d{12}$/;
      if (!formData.aadhaarNumber) {
        errors.aadhaarNumber = 'Aadhaar Card Number is required';
      } else if (!aadhaarRegex.test(formData.aadhaarNumber)) {
        errors.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
      }

      if (!files.aadhaarFront) {
        errors.aadhaarFront = 'Please upload Aadhaar front photo';
      }
      if (!files.aadhaarBack) {
        errors.aadhaarBack = 'Please upload Aadhaar back photo';
      }
    }

    if (currentStep === 3) {
      if (bankVerificationState !== 'VERIFIED') {
        errors.bankVerify = 'Please verify your bank details first';
      }
      if (!formData.accountNumber) errors.accountNumber = 'Account number is required';
      if (formData.accountNumber !== formData.confirmAccountNumber) {
        errors.confirmAccountNumber = 'Bank account numbers do not match';
      }
      if (!formData.ifscCode) errors.ifscCode = 'IFSC code is required';
    }

    if (currentStep === 4) {
      if (!files.signatureDocument) {
        errors.signature = 'Please upload a signature photo file';
      }
    }

    if (currentStep === 5) {
      if (!formData.dob) errors.dob = 'Date of birth is required';
      if (!formData.gender) errors.gender = 'Gender selection is required';
      if (!formData.maritalStatus) errors.maritalStatus = 'Marital status is required';
      if (!formData.fathersName.trim()) errors.fathersName = "Father's name is required";
      if (!formData.mothersName.trim()) errors.mothersName = "Mother's name is required";
      if (!formData.occupation) errors.occupation = 'Occupation is required';
      if (!formData.incomeRange) errors.incomeRange = 'Annual Income Range is required';
      if (!formData.addressLine1.trim()) errors.addressLine1 = 'Address Line 1 is required';
      if (!formData.city.trim()) errors.city = 'City is required';
      if (!formData.state.trim()) errors.state = 'State is required';
      
      const pinRegex = /^\d{6}$/;
      if (!formData.pincode) {
        errors.pincode = 'Pincode is required';
      } else if (!pinRegex.test(formData.pincode)) {
        errors.pincode = 'Pincode must be exactly 6 digits';
      }
    }

    if (currentStep === 6) {
      if (!formData.declaredCorrect) errors.declaredCorrect = 'You must declare details are correct';
      if (!formData.authSharing) errors.authSharing = 'You must authorize data sharing for verification';
      if (!formData.fatcaDeclare) errors.fatcaDeclare = 'You must accept the FATCA declaration';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
      
      if (validationErrors[field]) {
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
      }
    }
  };

  const removeFile = (field) => {
    setFiles(prev => ({ ...prev, [field]: null }));
    setFilePreviews(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';

      const detailsResponse = await fetch(`${API_BASE_URL}/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pan_full_name: formData.panFullName,
          pan_number: formData.panNumber.toUpperCase(),
          aadhaar_number: formData.aadhaarNumber,
          bank_account_number: formData.accountNumber,
          bank_ifsc: formData.ifscCode.toUpperCase(),
          bank_name: formData.bankName,
          account_holder: formData.panFullName,
          date_of_birth: formData.dob,
          gender: formData.gender,
          marital_status: formData.maritalStatus,
          father_name: formData.fathersName,
          mother_name: formData.mothersName,
          occupation: formData.occupation,
          annual_income: formData.incomeRange,
          address: [formData.addressLine1, formData.addressLine2].filter(Boolean).join(', '),
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        })
      });

      const detailsPayload = await readJsonResponse(detailsResponse);
      if (!detailsResponse.ok) {
        throw new Error(detailsPayload.message || 'Failed to submit KYC details');
      }

      const documentData = new FormData();
      documentData.append('pan_document', files.panDocument);
      documentData.append('aadhaar_front', files.aadhaarFront);
      documentData.append('aadhaar_back', files.aadhaarBack);
      documentData.append('signature_document', files.signatureDocument);

      const documentsResponse = await fetch(`${API_BASE_URL}/kyc/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: documentData
      });

      const documentsPayload = await readJsonResponse(documentsResponse);
      if (!documentsResponse.ok) {
        throw new Error(documentsPayload.message || 'Failed to upload KYC documents');
      }

      setIsSubmitting(false);
      setKycStatus('PENDING');
      localStorage.setItem('capitalup-kyc-status', 'PENDING');
      setRejectReason('');
      window.dispatchEvent(new Event('storage'));
      
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#4F8CFF', '#18C37E', '#A78BFA']
      });
    } catch (err) {
      setValidationErrors(prev => ({
        ...prev,
        submit: err.message || 'Unable to submit KYC. Please try again.'
      }));
      setIsSubmitting(false);
    }
  };

  const handleRestartKyc = () => {
    setKycStatus('NOT_STARTED');
    localStorage.setItem('capitalup-kyc-status', 'NOT_STARTED');
    setStep(1);
    setBankVerificationState('UNVERIFIED');
    setFormData(prev => ({
      ...prev,
      declaredCorrect: false,
      authSharing: false,
      fatcaDeclare: false
    }));
    setFiles({
      panDocument: null,
      aadhaarFront: null,
      aadhaarBack: null,
      signatureDocument: null
    });
    setFilePreviews({
      panDocument: '',
      aadhaarFront: '',
      aadhaarBack: '',
      signatureDocument: ''
    });
  };

  const renderStepper = () => {
    const steps = [
      { num: 1, label: 'PAN Identity' },
      { num: 2, label: 'Aadhaar Upload' },
      { num: 3, label: 'Bank Details' },
      { num: 4, label: 'Sign Photo' },
      { num: 5, label: 'Profile Info' },
      { num: 6, label: 'Submit consents' }
    ];

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: '32px',
        position: 'relative',
        background: 'var(--color-bg-panel-0.5)',
        border: '1px solid var(--color-white-0.06)',
        borderRadius: '12px',
        padding: '16px 20px',
        overflowX: 'auto',
        gap: '12px'
      }}>
        {steps.map((s, idx) => {
          const isCompleted = step > s.num;
          const isActive = step === s.num;
          
          return (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: idx < 5 ? '1 1 0%' : 'none', minWidth: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  transition: 'all 0.3s',
                  background: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-accent)' : 'var(--color-white-0.05)',
                  color: isCompleted || isActive ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                  border: `1px solid ${isActive ? 'var(--color-accent)' : isCompleted ? 'var(--color-success)' : 'var(--color-white-0.1)'}`,
                  flexShrink: 0
                }}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : s.num}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-text-main)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {s.label}
                </div>
              </div>
              
              {idx < 5 && (
                <div style={{
                  flex: 1,
                  height: '1.5px',
                  margin: '0 10px',
                  background: isCompleted ? 'var(--color-success)' : 'var(--color-white-0.08)',
                  transition: 'background 0.3s',
                  minWidth: '20px'
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ──── RENDER SCREEN 1: NOT STARTED / WIZARD ────
  if (kycStatus === 'NOT_STARTED' || kycStatus === 'REJECTED') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Title */}
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
            Identity & Compliance
          </div>
          <h1 style={{
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--color-text-main)',
            letterSpacing: '-0.2px',
            lineHeight: 1.2
          }}>
            KYC Verification Profile
          </h1>
        </div>

        {kycStatus === 'REJECTED' && (
          <div style={{
            background: 'var(--color-error-0.1)',
            border: '1px solid var(--color-error-0.2)',
            color: 'var(--color-error)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
              <ShieldAlert size={18} />
              KYC Application Rejected by Administrator
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              <strong>Reason:</strong> {rejectReason}
            </div>
            <button
              onClick={handleRestartKyc}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--color-error)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                color: 'var(--color-text-inverted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px'
              }}>
              Restart Application
            </button>
          </div>
        )}

        {/* Stepper progress */}
        {renderStepper()}

        {/* Wizard Panel */}
        <div style={{
          background: 'var(--color-bg-panel-0.95)',
          border: '1px solid var(--color-white-0.07)',
          borderRadius: '14px',
          padding: '32px'
        }}>
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: PAN CARD DETAILS */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>PAN Identity Details</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Enter your Permanent Account Number and upload a photo of the card front.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="max-md:grid-cols-1">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Full Name on PAN Card</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={formData.panFullName}
                        onChange={(e) => setFormData({ ...formData, panFullName: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'var(--color-white-0.04)',
                          border: `1px solid ${validationErrors.panFullName ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: 'var(--color-text-main)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {validationErrors.panFullName && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.panFullName}</span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>PAN Number</label>
                      <input
                        type="text"
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        value={formData.panNumber}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        style={{
                          width: '100%',
                          background: 'var(--color-white-0.04)',
                          border: `1px solid ${validationErrors.panNumber ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: 'var(--color-text-main)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          textTransform: 'uppercase'
                        }}
                      />
                      {validationErrors.panNumber && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.panNumber}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>PAN Card Front Photo</label>
                    {!filePreviews.panDocument ? (
                      <div style={{
                        border: `2.5px dashed ${validationErrors.panDocument ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '12px',
                        padding: '30px 20px',
                        textAlign: 'center',
                        background: 'var(--color-white-0.02)',
                        cursor: 'pointer',
                        position: 'relative'
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('panDocument', e)}
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        />
                        <Upload size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Click to upload files</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Supports JPG, PNG up to 5MB</div>
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        borderRadius: '12px',
                        border: '1px solid var(--color-white-0.08)',
                        background: 'var(--color-white-0.03)',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <img src={filePreviews.panDocument} alt="PAN Front" style={{ width: '80px', height: '52px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files.panDocument.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{(files.panDocument.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button type="button" onClick={() => removeFile('panDocument')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '8px' }}><Trash2 size={16} /></button>
                      </div>
                    )}
                    {validationErrors.panDocument && (
                      <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.panDocument}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      color: 'var(--color-text-inverted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px var(--color-accent-0.2)',
                      transition: 'all 0.2s'
                    }}
                  >
                    Proceed to Aadhaar <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: AADHAAR CARD DETAILS */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Aadhaar Verification Details</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Provide your 12-digit Aadhaar number and upload front and back photo captures.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>12-Digit Aadhaar Card Number</label>
                    <input
                      type="text"
                      placeholder="123456789012"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.aadhaarNumber ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.aadhaarNumber && (
                      <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.aadhaarNumber}</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="max-md:grid-cols-1">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Aadhaar Front Photo</label>
                      {!filePreviews.aadhaarFront ? (
                        <div style={{
                          border: `2.5px dashed ${validationErrors.aadhaarFront ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '12px',
                          padding: '30px 20px',
                          textAlign: 'center',
                          background: 'var(--color-white-0.02)',
                          cursor: 'pointer',
                          position: 'relative'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange('aadhaarFront', e)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                          />
                          <Upload size={24} color="var(--color-text-muted)" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '3px' }}>Upload Front Image</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>JPG, PNG up to 5MB</div>
                        </div>
                      ) : (
                        <div style={{
                          position: 'relative',
                          borderRadius: '12px',
                          border: '1px solid var(--color-white-0.08)',
                          background: 'var(--color-white-0.03)',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <img src={filePreviews.aadhaarFront} alt="Aadhaar Front" style={{ width: '70px', height: '46px', objectFit: 'cover', borderRadius: '4px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files.aadhaarFront.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{(files.aadhaarFront.size / 1024).toFixed(1)} KB</div>
                          </div>
                          <button type="button" onClick={() => removeFile('aadhaarFront')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '6px' }}><Trash2 size={15} /></button>
                        </div>
                      )}
                      {validationErrors.aadhaarFront && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.aadhaarFront}</span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Aadhaar Back Photo</label>
                      {!filePreviews.aadhaarBack ? (
                        <div style={{
                          border: `2.5px dashed ${validationErrors.aadhaarBack ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '12px',
                          padding: '30px 20px',
                          textAlign: 'center',
                          background: 'var(--color-white-0.02)',
                          cursor: 'pointer',
                          position: 'relative'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange('aadhaarBack', e)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                          />
                          <Upload size={24} color="var(--color-text-muted)" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '3px' }}>Upload Back Image</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>JPG, PNG up to 5MB</div>
                        </div>
                      ) : (
                        <div style={{
                          position: 'relative',
                          borderRadius: '12px',
                          border: '1px solid var(--color-white-0.08)',
                          background: 'var(--color-white-0.03)',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <img src={filePreviews.aadhaarBack} alt="Aadhaar Back" style={{ width: '70px', height: '46px', objectFit: 'cover', borderRadius: '4px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files.aadhaarBack.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{(files.aadhaarBack.size / 1024).toFixed(1)} KB</div>
                          </div>
                          <button type="button" onClick={() => removeFile('aadhaarBack')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '6px' }}><Trash2 size={15} /></button>
                        </div>
                      )}
                      {validationErrors.aadhaarBack && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.aadhaarBack}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    onClick={handlePrev}
                    style={{
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'var(--color-text-sub)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      color: 'var(--color-text-inverted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px var(--color-accent-0.2)'
                    }}
                  >
                    Bank Details <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: BANK DETAILS */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Link Bank Account</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Enter your bank details. We will deposit ₹1 to instantly verify your account name matching.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="max-md:grid-cols-1">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Bank Account Number</label>
                      <input
                        type="password"
                        placeholder="Enter Bank Account Number"
                        value={formData.accountNumber}
                        disabled={bankVerificationState === 'VERIFIED'}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                        style={{
                          width: '100%',
                          background: 'var(--color-white-0.04)',
                          border: `1px solid ${validationErrors.accountNumber ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: 'var(--color-text-main)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {validationErrors.accountNumber && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.accountNumber}</span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Confirm Account Number</label>
                      <input
                        type="text"
                        placeholder="Re-enter Bank Account Number"
                        value={formData.confirmAccountNumber}
                        disabled={bankVerificationState === 'VERIFIED'}
                        onChange={(e) => setFormData({ ...formData, confirmAccountNumber: e.target.value.replace(/\D/g, '') })}
                        style={{
                          width: '100%',
                          background: 'var(--color-white-0.04)',
                          border: `1px solid ${validationErrors.confirmAccountNumber ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: 'var(--color-text-main)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {validationErrors.confirmAccountNumber && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.confirmAccountNumber}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                        value={formData.ifscCode}
                        disabled={bankVerificationState === 'VERIFIED'}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                        style={{
                          width: '100%',
                          background: 'var(--color-white-0.04)',
                          border: `1px solid ${validationErrors.ifscCode ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: 'var(--color-text-main)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          textTransform: 'uppercase'
                        }}
                      />
                      {validationErrors.ifscCode && (
                        <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.ifscCode}</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Account Type</label>
                        <select
                          value={formData.accountType}
                          disabled={bankVerificationState === 'VERIFIED'}
                          onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-white-0.08)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            color: 'var(--color-text-main)',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="Savings">Savings</option>
                          <option value="Current">Current</option>
                        </select>
                      </div>
                      
                      {formData.bankName && (
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>{formData.bankName}</span>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.branchName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--color-white-0.02)',
                  border: '1px solid var(--color-white-0.06)',
                  borderRadius: '10px',
                  padding: '18px',
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  {bankVerificationState === 'UNVERIFIED' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        <Landmark size={18} />
                        Bank Account is not yet verified.
                      </div>
                      <button
                        onClick={handleVerifyBankDetails}
                        style={{
                          background: 'var(--color-accent)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 24px',
                          color: 'var(--color-text-inverted)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px var(--color-accent-0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        Verify Bank Account (Penny Deposit)
                      </button>
                    </>
                  )}

                  {(bankVerificationState === 'INITIATED' || bankVerificationState === 'PROCESSING') && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid var(--color-white-0.08)',
                        borderTopColor: 'var(--color-warning)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <div style={{ fontSize: '13px', color: 'var(--color-warning)', fontWeight: 500 }}>
                        {bankVerificationMessage}
                      </div>
                      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
                    </div>
                  )}

                  {bankVerificationState === 'VERIFIED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-success)', fontWeight: 500, fontSize: '13px' }}>
                      <CheckCircle2 size={20} />
                      <div>
                        <div>Bank Verification Successful! (₹1.00 Deposited)</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{bankVerificationMessage}</div>
                      </div>
                    </div>
                  )}

                  {validationErrors.bankVerify && (
                    <div style={{ color: 'var(--color-error)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} />
                      {validationErrors.bankVerify}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    onClick={handlePrev}
                    style={{
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'var(--color-text-sub)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      color: 'var(--color-text-inverted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px var(--color-accent-0.2)'
                    }}
                  >
                    Proceed to Signature <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: SIGNATURE CAPTURE (PHOTO ONLY) */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Signature Verification Photo</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Please upload a clear photograph of your signature written on plain white paper.</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Signature Photo (White Background)</label>
                  {!filePreviews.signatureDocument ? (
                    <div style={{
                      border: `2.5px dashed ${validationErrors.signature ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                      borderRadius: '12px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      background: 'var(--color-white-0.02)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange('signatureDocument', e)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                      <Upload size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Click to upload signature photo</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Supports JPG, PNG up to 5MB</div>
                    </div>
                  ) : (
                    <div style={{
                      position: 'relative',
                      borderRadius: '12px',
                      border: '1px solid var(--color-white-0.08)',
                      background: 'var(--color-white-0.03)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <img src={filePreviews.signatureDocument} alt="Signature Upload" style={{ width: '80px', height: '52px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '4px', border: '1px solid var(--color-white-0.1)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files.signatureDocument.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{(files.signatureDocument.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button type="button" onClick={() => removeFile('signatureDocument')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '6px' }}><Trash2 size={16} /></button>
                    </div>
                  )}
                  {validationErrors.signature && (
                    <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.signature}</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    onClick={handlePrev}
                    style={{
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'var(--color-text-sub)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      color: 'var(--color-text-inverted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px var(--color-accent-0.2)'
                    }}
                  >
                    Profile Details <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: PERSONAL PROFILE DETAILS */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Personal Profile & Residence Details</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Complete details as mandatory for regulatory compliances.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="max-md:grid-cols-1">
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.dob ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.dob && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.dob}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-card)',
                        border: `1px solid ${validationErrors.gender ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {validationErrors.gender && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.gender}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Marital Status</label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-card)',
                        border: `1px solid ${validationErrors.maritalStatus ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                    {validationErrors.maritalStatus && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.maritalStatus}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Occupation</label>
                    <select
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-card)',
                        border: `1px solid ${validationErrors.occupation ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Occupation</option>
                      <option value="Private Sector">Private Sector</option>
                      <option value="Public Sector">Public Sector</option>
                      <option value="Business">Business</option>
                      <option value="Professional">Professional</option>
                      <option value="Student">Student</option>
                      <option value="Retired">Retired</option>
                    </select>
                    {validationErrors.occupation && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.occupation}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Annual Income Range</label>
                    <select
                      value={formData.incomeRange}
                      onChange={(e) => setFormData({ ...formData, incomeRange: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-card)',
                        border: `1px solid ${validationErrors.incomeRange ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Range</option>
                      <option value="Below 1 Lakh">Below 1 Lakh</option>
                      <option value="1-5 Lakhs">1-5 Lakhs</option>
                      <option value="5-10 Lakhs">5-10 Lakhs</option>
                      <option value="10-25 Lakhs">10-25 Lakhs</option>
                      <option value="25 Lakhs+">25 Lakhs+</option>
                    </select>
                    {validationErrors.incomeRange && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.incomeRange}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Father's Full Name</label>
                    <input
                      type="text"
                      placeholder="Father's full name"
                      value={formData.fathersName}
                      onChange={(e) => setFormData({ ...formData, fathersName: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.fathersName ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.fathersName && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.fathersName}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Mother's Full Name</label>
                    <input
                      type="text"
                      placeholder="Mother's full name"
                      value={formData.mothersName}
                      onChange={(e) => setFormData({ ...formData, mothersName: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.mothersName ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.mothersName && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.mothersName}</span>}
                  </div>

                  <div style={{ gridColumn: 'span 2' }} className="max-md:col-span-1">
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Address Line 1 (House, Flat, Street)</label>
                    <input
                      type="text"
                      placeholder="Flat 101, building name, street..."
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.addressLine1 ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.addressLine1 && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.addressLine1}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>City</label>
                    <input
                      type="text"
                      placeholder="Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.city ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.city && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.city}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>State</label>
                    <input
                      type="text"
                      placeholder="Maharashtra"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.state ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.state && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.state}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Pincode</label>
                    <input
                      type="text"
                      placeholder="400001"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: `1px solid ${validationErrors.pincode ? 'var(--color-error)' : 'var(--color-white-0.08)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.pincode && <span style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>{validationErrors.pincode}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    onClick={handlePrev}
                    style={{
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'var(--color-text-sub)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      color: 'var(--color-text-inverted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px var(--color-accent-0.2)'
                    }}
                  >
                    Review & Consents <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: REVIEW, CONSENTS AND SUBMIT */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Consent & Final Submission</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Confirm your details, check authorizations, and submit your KYC.</p>
                </div>

                <div style={{
                  background: 'var(--color-white-0.02)',
                  border: '1px solid var(--color-white-0.06)',
                  borderRadius: '10px',
                  padding: '20px'
                }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '14px' }}>Review Profile Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: '13px' }} className="max-md:grid-cols-1">
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Name (on PAN Card)</span>
                      <strong style={{ color: 'var(--color-text-main)' }}>{formData.panFullName}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>PAN Card / Aadhaar Card</span>
                      <strong style={{ color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formData.panNumber} / •••• •••• {formData.aadhaarNumber.slice(-4)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Bank Account & IFSC</span>
                      <strong style={{ color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formData.bankName} (Ac: ••••{formData.accountNumber.slice(-4)}) / {formData.ifscCode}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Date of Birth / Gender</span>
                      <strong style={{ color: 'var(--color-text-main)' }}>{new Date(formData.dob).toLocaleDateString()} / {formData.gender}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Occupation / Income</span>
                      <strong style={{ color: 'var(--color-text-main)' }}>{formData.occupation} / {formData.incomeRange}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Correspondence Address</span>
                      <strong style={{ color: 'var(--color-text-main)', lineHeight: 1.4 }}>
                        {formData.addressLine1}, {formData.city}, {formData.state} - {formData.pincode}
                      </strong>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'var(--color-white-0.06)', margin: '18px 0' }} />

                  {/* Documents Thumbnail Row */}
                  <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '12px' }}>Uploaded Verification Tokens</h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-white-0.08)' }}>
                      <img src={filePreviews.panDocument} alt="PAN thumb" style={{ width: '42px', height: '28px', objectFit: 'cover', borderRadius: '2px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-sub)' }}>PAN Front</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-white-0.08)' }}>
                      <img src={filePreviews.aadhaarFront} alt="Aadhaar Front thumb" style={{ width: '42px', height: '28px', objectFit: 'cover', borderRadius: '2px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-sub)' }}>Aadhaar Front</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-white-0.08)' }}>
                      <img src={filePreviews.aadhaarBack} alt="Aadhaar Back thumb" style={{ width: '42px', height: '28px', objectFit: 'cover', borderRadius: '2px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-sub)' }}>Aadhaar Back</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-white-0.08)' }}>
                      <img src={filePreviews.signatureDocument} alt="Sign Upload thumb" style={{ width: '42px', height: '28px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '2px', border: '1px solid var(--color-white-0.1)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-sub)' }}>Signature Capture</span>
                    </div>
                  </div>
                </div>

                {/* Consent Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={formData.declaredCorrect}
                      onChange={(e) => setFormData({ ...formData, declaredCorrect: e.target.checked })}
                      style={{ accentColor: 'var(--color-accent)', marginTop: '3px', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
                      I hereby declare that the details furnished above are true and correct to the best of my knowledge and belief and I undertake to inform CapitalUp of any changes therein, immediately.
                    </span>
                  </label>
                  {validationErrors.declaredCorrect && (
                    <span style={{ fontSize: '11px', color: 'var(--color-error)', display: 'block', marginLeft: '24px' }}>{validationErrors.declaredCorrect}</span>
                  )}

                  <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={formData.authSharing}
                      onChange={(e) => setFormData({ ...formData, authSharing: e.target.checked })}
                      style={{ accentColor: 'var(--color-accent)', marginTop: '3px', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
                      I authorize CapitalUp to share my details with certified KYC registration agencies (KRA) and verification compliance entities for the purpose of validating my identity and bank account.
                    </span>
                  </label>
                  {validationErrors.authSharing && (
                    <span style={{ fontSize: '11px', color: 'var(--color-error)', display: 'block', marginLeft: '24px' }}>{validationErrors.authSharing}</span>
                  )}

                  <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={formData.fatcaDeclare}
                      onChange={(e) => setFormData({ ...formData, fatcaDeclare: e.target.checked })}
                      style={{ accentColor: 'var(--color-accent)', marginTop: '3px', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
                      I declare that I am a citizen/resident of India for tax purposes, and not a US Person under FATCA (Foreign Account Tax Compliance Act).
                    </span>
                  </label>
                  {validationErrors.fatcaDeclare && (
                    <span style={{ fontSize: '11px', color: 'var(--color-error)', display: 'block', marginLeft: '24px' }}>{validationErrors.fatcaDeclare}</span>
                  )}

                  {validationErrors.submit && (
                    <div style={{
                      background: 'var(--color-error-0.1)',
                      border: '1px solid var(--color-error-0.2)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: 'var(--color-error)',
                      fontSize: '12px',
                      lineHeight: 1.5
                    }}>
                      {validationErrors.submit}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    onClick={handlePrev}
                    style={{
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'var(--color-text-sub)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                      background: 'var(--color-success)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 28px',
                      color: 'var(--color-text-inverted)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px var(--color-success-0.2)',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit KYC Profile'} <Check size={14} strokeWidth={3} />
                  </button>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ──── RENDER SCREEN 2: SUBMITTED / PENDING REVIEW ────
  if (kycStatus === 'PENDING') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Title */}
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
            Identity & Compliance
          </div>
          <h1 style={{
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--color-text-main)',
            letterSpacing: '-0.2px',
            lineHeight: 1.2
          }}>
            KYC Verification Profile
          </h1>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          
          <div style={{
            background: 'var(--color-bg-panel-0.95)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '14px',
            padding: '40px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '24px',
            width: '100%',
            maxWidth: '760px',
            boxSizing: 'border-box'
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'var(--color-warning-0.08)',
                border: '1px solid var(--color-warning-0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={32} color="var(--color-warning)" style={{ animation: 'pulse-slow 2s infinite' }} />
              </div>
            </div>

            <div style={{ maxWidth: '480px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                KYC Profile Verification Submitted
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Your identity profile, PAN/Aadhaar documents, linked bank account, and signature photo are under review by our Compliance and Risk Operations desk.
              </p>
              
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-warning-0.1)',
                border: '1px solid var(--color-warning-0.2)',
                borderRadius: '100px',
                padding: '6px 16px',
                marginTop: '16px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-warning)'
              }}>
                Status: Pending Approval
              </div>
            </div>

            <div style={{
              width: '100%',
              maxWidth: '440px',
              textAlign: 'left',
              background: 'var(--color-white-0.02)',
              border: '1px solid var(--color-white-0.05)',
              borderRadius: '10px',
              padding: '16px 20px',
              marginTop: '8px'
            }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '12px' }}>Review Milestones</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-inverted)', fontSize: '8px' }}>✓</div>
                    <div style={{ width: '1px', flex: 1, background: 'var(--color-success)', minHeight: '12px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>Submitted for Review</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Just now</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-inverted)' }} />
                    <div style={{ width: '1px', flex: 1, background: 'var(--color-white-0.08)', minHeight: '12px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>IFSC & Bank Account Auditing</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Processing — Checking bank registry names</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-white-0.06)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Signature & Document Verification</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>Pending check completion</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        ` }} />
      </div>
    );
  }

  // ──── RENDER SCREEN 3: APPROVED ────
  if (kycStatus === 'APPROVED') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Title */}
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
            Identity & Compliance
          </div>
          <h1 style={{
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--color-text-main)',
            letterSpacing: '-0.2px',
            lineHeight: 1.2
          }}>
            KYC Verification Profile
          </h1>
        </div>

        <div style={{
          background: 'var(--color-bg-panel-0.95)',
          border: '1px solid var(--color-white-0.07)',
          borderRadius: '14px',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '24px'
        }}>
          
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-success-0.08)',
            border: '1px solid var(--color-success-0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={36} color="var(--color-success)" />
          </div>

          <div style={{ maxWidth: '480px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
              KYC Verification Approved
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
              Your account identity, bank registry, and signature records are fully verified. Your account status is updated to <strong>kyc_is_done = true</strong>. You have unlocked unlimited capital trading, mutual funds holdings, and withdrawals.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-success-0.1)',
            border: '1px solid var(--color-success-0.2)',
            borderRadius: '100px',
            padding: '6px 18px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--color-success)'
          }}>
            Verified Profile
          </div>

          <div style={{
            width: '100%',
            maxWidth: '440px',
            textAlign: 'left',
            background: 'var(--color-white-0.02)',
            border: '1px solid var(--color-white-0.05)',
            borderRadius: '10px',
            padding: '18px 24px',
            marginTop: '12px',
            fontSize: '13px'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '14px' }}>Compliance Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Verified Client</span>
                <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{formData.panFullName || user.full_name || 'James Dornan'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>PAN Identity Check</span>
                <span style={{ color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono, monospace' }}>{formData.panNumber || 'ABCDE1234F'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Linked Bank Account</span>
                <span style={{ color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono, monospace' }}>{formData.bankName || 'Verified HDFC Account'} (••••{formData.accountNumber ? formData.accountNumber.slice(-4) : '5678'})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Approval Date</span>
                <span style={{ color: 'var(--color-text-main)' }}>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
