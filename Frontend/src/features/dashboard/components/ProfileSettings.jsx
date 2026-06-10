import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Key, Check, Copy, Moon, Sun, Terminal, Eye, EyeOff, CheckCircle } from 'lucide-react';

export function ProfileSettings({ currentTheme, onChangeTheme }) {
  const [formData, setFormData] = useState(() => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem('capitalup-user') || '{}');
      return {
        name: cachedUser.full_name || '',
        email: cachedUser.email || '',
        phone: cachedUser.mobile_number || '',
        company: cachedUser.occupation || ''
      };
    } catch (e) {
      return { name: '', email: '', phone: '', company: '' };
    }
  });

  const [toggles, setToggles] = useState({
    twoFactor: true,
    emailAlerts: true,
    weeklyReports: false
  });

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [profile, setProfile] = useState(null);

  // OTP specific states
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpError, setOtpError] = useState('');

  // Password change states
  const [pwData, setPwData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [forgotPwMessage, setForgotPwMessage] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotPwLoading, setForgotPwLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    setForgotPwMessage('');

    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      
      let res;
      let payload;

      if (isForgotMode) {
        // Use the /auth/reset-password endpoint when in forgot mode
        res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            otp: pwData.otp,
            newPassword: pwData.newPassword
          })
        });
        payload = await res.json();
        if (res.ok && payload.success) {
          setPwSuccess('Password reset successfully using OTP!');
          setIsForgotMode(false);
          setPwData({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
        } else {
          setPwError(payload.message || 'Failed to reset password. Please check the OTP.');
        }
      } else {
        // Normal password change requiring current password
        res = await fetch(`${API_BASE_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: pwData.currentPassword,
            newPassword: pwData.newPassword
          })
        });
        payload = await res.json();
        if (res.ok && payload.success) {
          setPwSuccess('Password updated successfully!');
          setPwData({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
        } else {
          setPwError(payload.message || 'Failed to update password');
        }
      }
    } catch (err) {
      setPwError('Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleForgotClick = async () => {
    setPwError('');
    setPwSuccess('');
    setForgotPwMessage('');

    if (!formData.email) {
      setPwError('User email not found. Please log in again.');
      return;
    }

    setForgotPwLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          forceSend: true
        })
      });
      const payload = await res.json();
      if (res.ok && payload.success) {
        setIsForgotMode(true);
        setForgotPwMessage('A verification OTP has been sent to your email.');
      } else {
        setPwError(payload.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setPwError('Failed to send verification code.');
    } finally {
      setForgotPwLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const payload = await res.json();
      if (res.ok && payload.success) {
        const data = payload.data;
        setProfile(data);
        setFormData({
          name: data.full_name || '',
          email: data.email || '',
          phone: data.mobile_number || '',
          company: data.occupation || ''
        });
        setIsMobileVerified(data.is_mobile_verified || false);
      } else {
        setError(payload.message || 'Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load profile details from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSavedStatus(false);
    setError('');
    
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.name,
          mobile_number: formData.phone,
          occupation: formData.company
        })
      });
      
      const payload = await res.json();
      if (res.ok && payload.success) {
        setSavedStatus(true);
        const updated = payload.data;
        setProfile(updated);
        setIsMobileVerified(updated.is_mobile_verified || false);
        
        // Also update cached user in localStorage
        const userStr = localStorage.getItem('capitalup-user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.full_name = updated.full_name;
          userObj.mobile_number = updated.mobile_number;
          userObj.is_mobile_verified = updated.is_mobile_verified;
          localStorage.setItem('capitalup-user', JSON.stringify(userObj));
        }
        setTimeout(() => setSavedStatus(false), 3000);
      } else {
        setError(payload.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to save profile changes.');
    }
  };

  const handleSendMobileOtp = async () => {
    if (!formData.phone || !/^[0-9]{10}$/.test(formData.phone)) {
      setOtpError('Please enter a valid 10-digit phone number first.');
      return;
    }

    setOtpError('');
    setOtpMessage('');
    setOtpLoading(true);
    
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      
      // Defensively construct PATCH payload to prevent validation failure for empty fields
      const patchData = {
        mobile_number: formData.phone
      };
      if (formData.name && formData.name.trim().length >= 2) {
        patchData.full_name = formData.name.trim();
      }
      if (formData.company) {
        patchData.occupation = formData.company;
      }

      // Auto-save the new phone number to the backend profile first
      const saveRes = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(patchData)
      });

      if (!saveRes.ok) {
        const savePayload = await saveRes.json();
        throw new Error(savePayload.message || 'Failed to update phone number in profile.');
      }

      setIsMobileVerified(false);

      // Trigger OTP sending
      const res = await fetch(`${API_BASE_URL}/auth/send-mobile-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mobile_number: formData.phone })
      });
      
      const payload = await res.json();
      if (res.ok && payload.success) {
        setOtpMessage('Verification SMS sent successfully.');
        setShowOtpInput(true);
      } else {
        setOtpError(payload.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setOtpError(err.message || 'Failed to send verification SMS.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setOtpError('Please enter a valid OTP code.');
      return;
    }
    
    setOtpError('');
    setOtpMessage('');
    setOtpLoading(true);
    
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/auth/verify-mobile-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mobile_number: formData.phone, otp: otpCode })
      });
      
      const payload = await res.json();
      if (res.ok && payload.success) {
        setIsMobileVerified(true);
        setOtpMessage('Mobile number verified successfully!');
        
        // Update cached user in localStorage
        const userStr = localStorage.getItem('capitalup-user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.mobile_number = formData.phone;
          userObj.is_mobile_verified = true;
          localStorage.setItem('capitalup-user', JSON.stringify(userObj));
        }
        
        setTimeout(() => {
          setShowOtpInput(false);
          setOtpMessage('');
          setOtpCode('');
        }, 2500);
      } else {
        setOtpError(payload.message || 'Invalid verification code.');
      }
    } catch (err) {
      setOtpError('Failed to verify OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const rawApiKey = 'cu_live_83f920da1bcde0837e7a828e192ff83c79a1f';
  const displayApiKey = apiKeyVisible ? rawApiKey : 'cu_live_••••••••••••••••••••••••••••••••••••';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(rawApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const themeOptions = [
    {
      id: 'default',
      name: 'Default Dark',
      description: 'Sleek dark interface with neon blue accents. Premium & easy on the eyes.',
      bg: '#111315',
      primary: '#4F8CFF',
      foreground: '#F7F8FA',
      cardBg: '#1D2126',
      icon: Moon
    },
    {
      id: 'light',
      name: 'Greyish Light',
      description: 'Clean off-white backgrounds with deep slate text and rich cobalt accents.',
      bg: '#EAECEE',
      primary: '#2563EB',
      foreground: '#1A1D20',
      cardBg: '#FFFFFF',
      icon: Sun
    },
    {
      id: 'hacker',
      name: 'Matrix Hacker',
      description: 'Pure green-black backdrop with retro terminal vibes and glowing neon-green accents.',
      bg: '#080C08',
      primary: '#22C55E',
      foreground: '#A3E635',
      cardBg: '#0D150D',
      icon: Terminal
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid var(--color-white-0.08)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Loading settings...</span>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        ` }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Title */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
          Preferences & Controls
        </div>
        <h1
          style={{
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--color-text-main)',
            letterSpacing: '-0.2px',
            lineHeight: 1.2
          }}>
          Account Profile & Settings
        </h1>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--color-error)',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'DM Sans, sans-serif'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }} className="max-xl:grid-cols-1">
        
        {/* Left column: Forms & Theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Theme customizer */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif' }}>Platform Theme Customization</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Choose your platform theme. The transition applies a premium 3D page flip effect as the variables update globally.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="max-md:grid-cols-1">
              {themeOptions.map((opt) => {
                const isSelected = currentTheme === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onChangeTheme(opt.id)}
                    style={{
                      background: opt.cardBg,
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-white-0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                      boxShadow: isSelected ? '0 10px 25px -10px var(--color-accent-0.3)' : 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--color-white-0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--color-white-0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}>
                    
                    {/* Header: Icon + Color dots */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'var(--color-white-0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: opt.primary
                        }}>
                        <IconComponent size={16} />
                      </div>
                      
                      {/* Color Preview */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.bg, border: '1px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.cardBg, border: '1px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.primary }} />
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: opt.foreground, marginBottom: '4px' }}>{opt.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{opt.description}</div>
                    </div>

                    {/* Checkmark overlay */}
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--color-accent)',
                          color: 'var(--color-text-inverted)',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile form */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <User size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif' }}>Personal Information</h2>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="max-md:grid-cols-1">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.02)',
                      border: '1px solid var(--color-white-0.04)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-muted)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'not-allowed'
                    }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.02)',
                      border: '1px solid var(--color-white-0.04)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-muted)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'not-allowed'
                    }} />
                </div>
              </div>

              <div style={{ display: isMobileVerified ? 'grid' : 'block', gridTemplateColumns: isMobileVerified ? '1fr 1fr' : 'none', gap: '16px' }} className="max-md:grid-cols-1">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Investment Entity / Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} />
                </div>

                {isMobileVerified && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={formData.phone}
                        disabled
                        style={{
                          width: '100%',
                          background: 'var(--color-white-0.02)',
                          border: '1px solid var(--color-white-0.04)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          paddingRight: '80px',
                          color: 'var(--color-text-muted)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'not-allowed'
                        }} />
                      <span style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        color: 'var(--color-success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'var(--color-success-0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 500
                      }}>
                        <CheckCircle size={11} /> Verified
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <button
                   type="submit"
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
                   }}>
                  Save Profiles Changes
                </button>

                {savedStatus && (
                  <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} />
                    Changes saved successfully!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Mobile Verification Box */}
          {!isMobileVerified && (
            <div
              style={{
                background: 'var(--color-bg-panel-0.95)',
                border: '1px solid var(--color-white-0.07)',
                borderRadius: '14px',
                padding: '24px'
              }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Phone size={16} color="var(--color-accent)" />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Mobile Verification</h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                Verify your mobile number to enable SMS notifications and secure two-factor authentication.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Phone Number</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter 10-digit number"
                      style={{
                        flex: 1,
                        background: 'var(--color-white-0.04)',
                        border: '1px solid var(--color-white-0.08)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} />
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      disabled={otpLoading}
                      style={{
                        background: 'var(--color-accent)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        color: 'var(--color-text-inverted)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px var(--color-accent-0.2)',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}>
                      {otpLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    {isMobileVerified ? (
                      <span style={{ fontSize: '11px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-success-0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                        <CheckCircle size={12} /> Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-warning-0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                        Unverified
                      </span>
                    )}
                  </div>

                  {otpMessage && (
                    <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={12} /> {otpMessage}
                    </div>
                  )}

                  {otpError && (
                    <div style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '8px' }}>{otpError}</div>
                  )}

                  {showOtpInput && (
                    <div
                      style={{
                        marginTop: '16px',
                        background: 'var(--color-white-0.03)',
                        border: '1px solid var(--color-white-0.08)',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-sub)' }}>
                        Enter the 6-digit verification code sent to your phone:
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          style={{
                            flex: 1,
                            background: 'var(--color-white-0.04)',
                            border: '1px solid var(--color-white-0.08)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            color: 'var(--color-text-main)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyMobileOtp}
                          disabled={otpLoading}
                          style={{
                            background: 'var(--color-success)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            color: 'var(--color-text-inverted)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px var(--color-success-0.2)',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}>
                          {otpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Didn't get the code?{' '}
                        <button
                          type="button"
                          onClick={handleSendMobileOtp}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 500, padding: 0, fontSize: '11px' }}>
                          Resend Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API keys */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Key size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif' }}>Developer API Key</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Use your API key to fetch portfolio allocations and asset metrics into external tools or Excel sheets.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.06)', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayApiKey}
              </span>
              
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-sub)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                {apiKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              <button
                onClick={handleCopyKey}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedKey ? 'var(--color-success)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { if (!copiedKey) e.currentTarget.style.color = 'var(--color-text-sub)' }}
                onMouseLeave={(e) => { if (!copiedKey) e.currentTarget.style.color = 'var(--color-text-muted)' }}>
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Key size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Security Password Update</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              To change your password, first enter your current password, followed by your new password.
            </p>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                {isForgotMode ? (
                  <>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Verification OTP</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP"
                      value={pwData.otp}
                      onChange={(e) => setPwData({ ...pwData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: '1px solid var(--color-white-0.08)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} />
                    <div style={{ marginTop: '6px', textAlign: 'left' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(false);
                          setPwError('');
                          setPwSuccess('');
                          setForgotPwMessage('');
                          setPwData({ ...pwData, otp: '', currentPassword: '' });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-accent)',
                          fontSize: '11px',
                          fontWeight: 500,
                          fontFamily: 'DM Sans, sans-serif',
                          padding: 0
                        }}>
                        Back to regular password update
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={pwData.currentPassword}
                      onChange={(e) => setPwData({ ...pwData, currentPassword: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: '1px solid var(--color-white-0.08)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} />
                    <div style={{ marginTop: '6px', textAlign: 'left' }}>
                      <button
                        type="button"
                        onClick={handleForgotClick}
                        disabled={forgotPwLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-accent)',
                          fontSize: '11px',
                          fontWeight: 500,
                          fontFamily: 'DM Sans, sans-serif',
                          padding: 0,
                          opacity: forgotPwLoading ? 0.7 : 1
                        }}>
                        {forgotPwLoading ? 'Sending OTP...' : 'Forgot your current password?'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="max-md:grid-cols-1">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters"
                      value={pwData.newPassword}
                      onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: '1px solid var(--color-white-0.08)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        paddingRight: '40px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Confirm New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={pwData.confirmPassword}
                      onChange={(e) => setPwData({ ...pwData, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--color-white-0.04)',
                        border: '1px solid var(--color-white-0.08)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        paddingRight: '40px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {pwError && (
                <div style={{ fontSize: '12.5px', color: 'var(--color-error)', fontWeight: 500 }}>
                  {pwError}
                </div>
              )}

              {pwSuccess && (
                <div style={{ fontSize: '12.5px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} /> {pwSuccess}
                </div>
              )}

              {forgotPwMessage && (
                <div style={{ fontSize: '12.5px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} /> {forgotPwMessage}
                </div>
              )}

              <div style={{ display: 'flex', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={pwLoading}
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
                    transition: 'all 0.2s',
                    opacity: pwLoading ? 0.8 : 1
                  }}>
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right column: Card details / info widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* User overview card */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-0.1) 0%, rgba(167, 139, 250, 0.05) 100%)',
              border: '1px solid var(--color-white-0.08)',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}>
            
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #A78BFA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--color-text-inverted)',
                boxShadow: '0 8px 24px var(--color-accent-0.2)'
              }}>
              {formData.name ? formData.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>{formData.name || 'User'}</h3>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formData.email || 'user@example.com'}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-accent-0.1)', border: '1px solid var(--color-accent-0.3)', borderRadius: '100px', padding: '4px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 600 }}>Premium Client</span>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--color-white-0.06)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Joined Platform</span>
                <span style={{ color: 'var(--color-text-sub)' }}>
                  {profile && profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'June 2, 2024'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Primary Currency</span>
                <span style={{ color: 'var(--color-text-sub)' }}>USD ($)</span>
              </div>
            </div>
          </div>

          {/* Security controls */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '20px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Shield size={15} color="var(--color-accent)" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>Security Settings</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 2FA Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Two-Factor Auth (2FA)</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Secure login using SMS/Authenticator.</div>
                </div>
                <button
                  onClick={() => setToggles({ ...toggles, twoFactor: !toggles.twoFactor })}
                  style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '100px',
                    background: toggles.twoFactor ? 'var(--color-success)' : 'var(--color-white-0.12)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: toggles.twoFactor ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </button>
              </div>

              {/* Email Alerts Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Transaction Notifications</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Email alert on asset buy/sell order.</div>
                </div>
                <button
                  onClick={() => setToggles({ ...toggles, emailAlerts: !toggles.emailAlerts })}
                  style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '100px',
                    background: toggles.emailAlerts ? 'var(--color-success)' : 'var(--color-white-0.12)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: toggles.emailAlerts ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </button>
              </div>

              {/* Weekly Reports Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Weekly Digest Reports</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Receive summary analysis every Monday.</div>
                </div>
                <button
                  onClick={() => setToggles({ ...toggles, weeklyReports: !toggles.weeklyReports })}
                  style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '100px',
                    background: toggles.weeklyReports ? 'var(--color-success)' : 'var(--color-white-0.12)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: toggles.weeklyReports ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
