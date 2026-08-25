import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy, Calendar, Clock, IndianRupee, Phone, Upload, CheckCircle2, AlertCircle, ArrowLeft, Camera, X } from 'lucide-react';
import * as api from '../api/client';

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDeadline(deadlineStr) {
  if (!deadlineStr) return '';
  try {
    const d = new Date(deadlineStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return deadlineStr;
  }
}

export default function PlayerRegistration() {
  const [searchParams] = useSearchParams();
  const tid = searchParams.get('tid');

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [registeredName, setRegisteredName] = useState('');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [wing, setWing] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [expertise, setExpertise] = useState('');
  const [playedStateNational, setPlayedStateNational] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!tid) return;
    api.getRegistrationInfo(tid)
      .then(data => { setInfo(data); setLoading(false); })
      .catch(() => { setError('Failed to load tournament info'); setLoading(false); });
  }, [tid]);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validations
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    if (!wing) {
      setError('Please select your wing');
      return;
    }
    if (!flatNo || flatNo.length < 3 || flatNo.length > 4) {
      setError('Flat number must be 3 to 4 digits');
      return;
    }
    if (!age || parseInt(age) < 1) {
      setError('Please enter a valid age');
      return;
    }
    if (info?.category === 'Adults' && !gender) {
      setError('Please select your gender');
      return;
    }
    if (!expertise) {
      setError('Please select your expertise level');
      return;
    }
    if (!playedStateNational) {
      setError('Please indicate if you have played State/National');
      return;
    }
    if (!paymentConfirmed && info?.entry_fees > 0) {
      setError('Please confirm your payment');
      return;
    }
    // Mobile validation
    if (!mobile || mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
      setError('Mobile number is required and must be exactly 10 digits');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('first_name', firstName.trim());
    formData.append('last_name', lastName.trim());
    formData.append('mobile', mobile);
    formData.append('wing', wing);
    formData.append('flat_no', flatNo);
    formData.append('age', age);
    formData.append('gender', gender);
    formData.append('expertise', expertise);
    formData.append('played_state_national', playedStateNational);
    formData.append('payment_confirmed', paymentConfirmed ? 'true' : 'false');
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      const res = await api.registerPlayer(tid, formData);
      setRegisteredName(res.player?.name || `${firstName} ${lastName}`);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!tid) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <AlertCircle size={48} color="var(--accent-danger)" style={{ marginBottom: '1rem' }} />
        <h2>Invalid Link</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No tournament specified. Please go back to the dashboard.</p>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="pulse" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading registration...</div>
      </div>
    );
  }

  // Success Screen
  if (success) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '3rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <div className="glass-card" style={{ padding: '3rem 2rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <CheckCircle2 size={40} color="#10b981" />
          </div>
          <h2 style={{ marginBottom: '0.5rem', color: '#10b981' }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{registeredName}</strong> has been registered for <strong style={{ color: 'var(--text-primary)' }}>{info?.name}</strong>.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
            You can check the registered players list on the dashboard.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <button className="btn btn-primary" onClick={() => {
              setSuccess(false);
              setFirstName(''); setLastName(''); setMobile(''); setWing(''); setFlatNo('');
              setAge(''); setGender(''); setExpertise(''); setPlayedStateNational('');
              setPaymentConfirmed(false); setPhoto(null); setPhotoPreview(null);
              setError('');
            }}>
              Register Another Player
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDeadlinePassed = info?.registration_deadline && new Date(info.registration_deadline) < new Date();

  if (isDeadlinePassed) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <Clock size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
        <h2>Registration Closed</h2>
        <p style={{ color: 'var(--text-secondary)' }}>The registration deadline for <strong>{info?.name}</strong> has passed.</p>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '640px', margin: '1rem auto', padding: '0 1rem' }}>
      {/* Back button */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Info Banner */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(to right, #60a5fa, #a78bfa, #f472b6)',
        }} />

        <div style={{ padding: '0.5rem 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Trophy size={24} color="#60a5fa" />
            <h2 style={{ margin: 0 }}>{info?.name || 'Tournament'}</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
            Welcome! Register yourself for <strong style={{ color: 'var(--text-primary)' }}>{info?.name}</strong>. Fill in your details below to secure your spot.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {info?.start_date && info?.end_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Calendar size={16} color="#60a5fa" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tournament Dates:</strong> {formatDateDisplay(info.start_date)} — {formatDateDisplay(info.end_date)}
                </span>
              </div>
            )}
            {info?.registration_deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Clock size={16} color="#f59e0b" />
                <span style={{ color: '#f59e0b' }}>
                  <strong style={{ color: 'inherit', fontWeight: 600 }}>Registration Deadline:</strong> {formatDeadline(info.registration_deadline)}
                </span>
              </div>
            )}
            {info?.entry_fees > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <IndianRupee size={16} color="#10b981" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Entry Fees:</strong> ₹{info.entry_fees}
                </span>
              </div>
            )}
            {info?.upi_payment_number && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Phone size={16} color="#a78bfa" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>UPI:</strong> <span style={{ cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { navigator.clipboard.writeText(info.upi_payment_number); }}>{info.upi_payment_number}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginLeft: '0.25rem', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(info.upi_payment_number); }}>(copy)</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="glass-card">
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem' }}>Player Registration</h3>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', color: '#ef4444', fontSize: '0.9rem',
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">First Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="form-input" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="form-input" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          {/* Mobile */}
          <div className="form-group">
            <label className="form-label">Mobile Number <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="tel"
              className="form-input"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setMobile(v); }}
              maxLength={10}
              required
            />
          </div>

          {/* Wing & Flat */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Wing <span style={{ color: '#ef4444' }}>*</span></label>
              <select className="form-input" value={wing} onChange={e => setWing(e.target.value)} required>
                <option value="">Select Wing</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Flat No. <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 101"
                value={flatNo}
                onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setFlatNo(v); }}
                maxLength={4}
                required
              />
            </div>
          </div>

          {/* Age & Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: info?.category === 'Adults' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Age <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="number"
                className="form-input"
                placeholder="Your age"
                value={age}
                onChange={e => setAge(e.target.value)}
                min="1"
                max="99"
                required
              />
            </div>
            {info?.category === 'Adults' && (
              <div className="form-group">
                <label className="form-label">Gender <span style={{ color: '#ef4444' }}>*</span></label>
                <select className="form-input" value={gender} onChange={e => setGender(e.target.value)} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            )}
          </div>

          {info?.category === 'Kids' && info?.kids_age_limit && age && (
            <div style={{
              padding: '0.5rem 0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
              background: parseInt(age) <= info.kids_age_limit ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
              border: parseInt(age) <= info.kids_age_limit ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)',
              fontSize: '0.85rem',
              color: parseInt(age) <= info.kids_age_limit ? '#60a5fa' : '#a855f7',
            }}>
              Category: <strong>{parseInt(age) <= info.kids_age_limit ? 'Junior' : 'Senior'}</strong>
              {' '}(Age limit for Junior: ≤{info.kids_age_limit})
            </div>
          )}

          {/* Expertise */}
          <div className="form-group">
            <label className="form-label">Expertise <span style={{ color: '#ef4444' }}>*</span></label>
            <select className="form-input" value={expertise} onChange={e => setExpertise(e.target.value)} required>
              <option value="">Select Expertise</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          {/* Played State/National */}
          <div className="form-group">
            <label className="form-label">Played State / National? <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                <input type="radio" name="state_national" value="Yes" checked={playedStateNational === 'Yes'} onChange={e => setPlayedStateNational(e.target.value)} />
                Yes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                <input type="radio" name="state_national" value="No" checked={playedStateNational === 'No'} onChange={e => setPlayedStateNational(e.target.value)} />
                No
              </label>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="form-group">
            <label className="form-label">Photo</label>
            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-lg)',
                  padding: '2rem', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s ease', background: 'rgba(255,255,255,0.02)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              >
                <Camera size={32} color="var(--text-secondary)" style={{ marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click to upload your photo</p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.7 }}>JPG, PNG or WEBP</p>
              </div>
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--glass-border)' }}
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    background: 'var(--accent-danger)', color: '#fff', border: 'none',
                    borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Payment Confirmation */}
          {info?.entry_fees > 0 && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)' }}>
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={e => setPaymentConfirmed(e.target.checked)}
                  style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#10b981' }}
                />
                <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                  I confirm that I have made the payment of <strong style={{ color: '#10b981' }}>₹{info.entry_fees}</strong> to the UPI number <strong>{info.upi_payment_number}</strong>.
                </span>
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <span className="pulse">Registering...</span>
              </span>
            ) : (
              'Submit Registration'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
