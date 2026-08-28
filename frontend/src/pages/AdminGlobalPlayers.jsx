import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit, Trash2, Camera, Save, AlertTriangle,
  ArrowLeft, Search, User, X, Trophy, Medal,
  ChevronDown, ChevronRight, Plus
} from 'lucide-react';
import * as api from '../api/client';

// ── Sport accent config ──────────────────────────────────────
const SPORT_CONFIG = {
  Badminton: {
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))',
    border: 'rgba(59, 130, 246, 0.3)',
    accent: '#60a5fa',
    icon: '🏸',
  },
  'Table Tennis': {
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(52, 211, 153, 0.15))',
    border: 'rgba(16, 185, 129, 0.3)',
    accent: '#34d399',
    icon: '🏓',
  },
  Pickleball: {
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.15))',
    border: 'rgba(245, 158, 11, 0.3)',
    accent: '#fbbf24',
    icon: (
      <svg width="1.1em" height="1.1em" viewBox="-3 -3 30 30" fill="none" style={{ verticalAlign: 'middle', overflow: 'visible' }}>
        <defs>
          <linearGradient id="paddleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <g transform="rotate(25, 12, 12)">
          <path d="M 9 1 H 15 A 3 3 0 0 1 18 4 V 12 C 18 14, 14 14, 14 16 V 22 L 14.5 22.5 Q 12 23.5 9.5 22.5 L 10 22 V 16 C 10 14, 6 14, 6 12 V 4 A 3 3 0 0 1 9 1 Z" fill="url(#paddleGrad)" />
          <path d="M10 16 V 22 L 14.5 22.5 Q 12 23.5 9.5 22.5 L 10 22 V 16 Z" fill="#1f2937" />
          <path d="M10 17h4v1h-4z M10 19h4v1h-4z M10 21h4v1h-4z" fill="#374151" />
        </g>
        <circle cx="18.5" cy="15" r="4.5" fill="#ccff00" stroke="#a3cc00" strokeWidth="0.5" />
        <circle cx="18.5" cy="15" r="0.75" fill="#222" fillOpacity="0.4" />
        <circle cx="18.5" cy="12.5" r="0.75" fill="#222" fillOpacity="0.4" />
        <circle cx="18.5" cy="17.5" r="0.75" fill="#222" fillOpacity="0.4" />
        <circle cx="16" cy="15" r="0.75" fill="#222" fillOpacity="0.4" />
        <circle cx="21" cy="15" r="0.75" fill="#222" fillOpacity="0.4" />
      </svg>
    ),
  },
};

// ── Stat category display labels ─────────────────────────────
const CATEGORY_LABELS = {
  total: 'Overall',
  mens_singles: "Men's Singles",
  mens_doubles: "Men's Doubles",
  womens_singles: "Women's Singles",
  womens_doubles: "Women's Doubles",
  mixed_doubles: 'Mixed Doubles',
  junior_singles: 'Junior Singles',
  senior_singles: 'Senior Singles',
  junior_doubles: 'Junior Doubles',
  senior_doubles: 'Senior Doubles',
};

function winPct(won, played) {
  if (!played) return '0.0';
  return ((won / played) * 100).toFixed(1);
}

function pointWinPct(won, lost) {
  const total = won + lost;
  if (!total) return '0.0';
  return ((won / total) * 100).toFixed(1);
}

// ── Stats Table Component ────────────────────────────────────
function StatsTable({ stats, accent }) {
  if (!stats || stats.played === 0) return null;
  return (
    <div className="table-container" style={{ border: 'none', borderRadius: 'var(--radius-md)' }}>
      <table style={{ margin: 0 }}>
        <thead>
          <tr>
            <th>Played</th>
            <th>Won</th>
            <th>Lost</th>
            <th>Win%</th>
            <th>Pts Won</th>
            <th>Pts Lost</th>
            <th>Pt Win%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600 }}>{stats.played}</td>
            <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{stats.won}</td>
            <td style={{ color: 'var(--accent-danger)' }}>{stats.lost}</td>
            <td style={{ color: accent, fontWeight: 700 }}>{winPct(stats.won, stats.played)}%</td>
            <td>{stats.points_won}</td>
            <td>{stats.points_lost}</td>
            <td style={{ fontWeight: 600 }}>{pointWinPct(stats.points_won, stats.points_lost)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Sport Card Component ─────────────────────────────────────
function SportCard({ sportName, sportData }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const config = SPORT_CONFIG[sportName] || SPORT_CONFIG.Badminton;
  const stats = sportData.stats || {};

  const toggleCategory = (cat) =>
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  // Filter categories that have been played
  const categories = Object.entries(stats)
    .filter(([key, val]) => key !== 'total' && val.played > 0)
    .map(([key, val]) => [key, val]);

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        background: config.gradient,
        borderColor: config.border,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${config.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>{config.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: config.accent }}>
              {sportName}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {sportData.tournaments?.length || 0} tournament{(sportData.tournaments?.length || 0) !== 1 ? 's' : ''} played
            </p>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sportData.expertise && sportData.expertise !== 'None' && (
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--accent-secondary)',
                fontSize: '0.8rem',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Trophy size={13} /> {sportData.expertise}
            </span>
          )}
        </div>
      </div>

      {/* Overall Stats */}
      <div style={{ padding: '1rem 1.5rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Overall Performance
        </h4>
        {stats.total?.played > 0 ? (
          <StatsTable stats={stats.total} accent={config.accent} />
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No matches played yet.</p>
        )}
      </div>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          <h4
            style={{
              margin: '0 0 0.75rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              borderTop: `1px solid ${config.border}`,
              paddingTop: '1rem',
            }}
          >
            Category Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(([catKey, catStats]) => (
              <div
                key={catKey}
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => toggleCategory(catKey)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {expandedCategories[catKey] ? (
                      <ChevronDown size={16} color={config.accent} />
                    ) : (
                      <ChevronRight size={16} color={config.accent} />
                    )}
                    {CATEGORY_LABELS[catKey] || catKey}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    {catStats.won}W / {catStats.lost}L ({catStats.played} played)
                  </span>
                </button>
                {expandedCategories[catKey] && (
                  <div style={{ padding: '0 1rem 0.75rem' }}>
                    <StatsTable stats={catStats} accent={config.accent} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tournaments Played */}
      {sportData.tournaments?.length > 0 && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${config.border}`,
            background: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Tournaments
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {sportData.tournaments.map((t, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {t.tournament_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────
const currentYear = new Date().getFullYear();
const birthYearsList = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

export default function AdminGlobalPlayers() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    wing: '',
    flat_no: '',
    birth_year: '',
    gender: '',
    expertise: ''
  });
  const [addPhotoFile, setAddPhotoFile] = useState(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState(null);
  const addFileInputRef = useRef(null);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Load all players on mount
  useEffect(() => {
    api
      .getGlobalPlayers()
      .then((data) => {
        setAllPlayers(data);
        setFilteredPlayers(data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchRef.current &&
        !searchRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter players
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredPlayers(allPlayers);
    } else {
      const q = searchText.toLowerCase();
      setFilteredPlayers(allPlayers.filter((p) => p.name.toLowerCase().includes(q)));
    }
  }, [searchText, allPlayers]);

  // Select a player
  async function selectPlayer(player) {
    setSearchText(player.name);
    setShowDropdown(false);
    setSelectedPlayer(player);
    setProfileLoading(true);
    try {
      const profile = await api.getAdminGlobalPlayerProfile(player.key);
      setProfileData(profile);
    } catch {
      setProfileData(null);
    }
    setProfileLoading(false);
  }


  function handleEditClick() {
    setEditFormData({
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      gender: profileData.gender || '',
      birth_year: profileData.birth_year || '',
      wing: profileData.wing || '',
      flat_no: profileData.flat_no || '',
      sports_expertise: Object.keys(profileData.sports || {}).reduce((acc, sport) => {
        acc[sport] = profileData.sports[sport].expertise || '';
        return acc;
      }, {})
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(profileData.photo_url || null);
    setIsEditing(true);
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setEditPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  function removePhoto() {
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', editFormData.first_name);
      formData.append('last_name', editFormData.last_name);
      formData.append('gender', editFormData.gender);
      formData.append('birth_year', editFormData.birth_year);
      formData.append('wing', editFormData.wing);
      formData.append('flat_no', editFormData.flat_no);
      formData.append('sports_expertise', JSON.stringify(editFormData.sports_expertise));

      if (editPhotoFile) {
        formData.append('photo', editPhotoFile);
      } else if (!editPhotoPreview && profileData.photo_url) {
        formData.append('remove_photo', 'true');
      }

      const res = await api.updateGlobalPlayer(selectedPlayer.key, formData);
      setProfileData(res.player);
      setIsEditing(false);

      // Update in allPlayers/filteredPlayers if needed
      const updated = allPlayers.map(p => p.key === selectedPlayer.key ? { ...p, ...res.player } : p);
      setAllPlayers(updated);
      setFilteredPlayers(updated);
      setSelectedPlayer({ ...selectedPlayer, ...res.player });

    } catch (err) {
      alert("Error saving profile: " + err.message);
    }
    setProfileLoading(false);
  }

  async function handleDeleteProfile() {
    try {
      await api.deleteGlobalPlayer(selectedPlayer.key);
      setShowDeleteConfirm(false);
      clearSelection();

      const updated = allPlayers.filter(p => p.key !== selectedPlayer.key);
      setAllPlayers(updated);
      setFilteredPlayers(updated);
    } catch (err) {
      alert("Error deleting profile: " + err.message);
    }
  }

  function handleAddPhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setAddPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAddPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  function removeAddPhoto() {
    setAddPhotoFile(null);
    setAddPhotoPreview(null);
    if (addFileInputRef.current) addFileInputRef.current.value = '';
  }

  async function handleAddGlobalPlayerSubmit(e) {
    e.preventDefault();
    setAddError('');

    // Validations
    if (!addFormData.first_name.trim() || !addFormData.last_name.trim()) {
      setAddError('First name and last name are required'); return;
    }
    if (!addFormData.mobile || addFormData.mobile.length !== 10 || !/^\d{10}$/.test(addFormData.mobile)) {
      setAddError('Mobile number is required and must be exactly 10 digits'); return;
    }
    if (!addFormData.wing) { setAddError('Please select wing'); return; }
    if (!addFormData.flat_no || addFormData.flat_no.length < 3 || addFormData.flat_no.length > 4) {
      setAddError('Flat number must be 3 to 4 digits'); return;
    }
    if (!addFormData.birth_year || parseInt(addFormData.birth_year) < 1900 || parseInt(addFormData.birth_year) > new Date().getFullYear()) {
      setAddError('Please enter a valid birth year'); return;
    }
    if (!addFormData.gender) { setAddError('Please select gender'); return; }

    setAddLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', addFormData.first_name);
      formData.append('last_name', addFormData.last_name);
      formData.append('mobile', addFormData.mobile);
      formData.append('gender', addFormData.gender);
      formData.append('birth_year', addFormData.birth_year);
      formData.append('wing', addFormData.wing);
      formData.append('flat_no', addFormData.flat_no);

      if (addPhotoFile) {
        formData.append('photo', addPhotoFile);
      }

      const res = await api.addGlobalPlayer(formData);

      // Update allPlayers list
      const updatedAll = [...allPlayers, res.player].sort((a, b) => a.name.localeCompare(b.name));
      setAllPlayers(updatedAll);
      setFilteredPlayers(updatedAll);

      // Reset and close form
      setAddFormData({
        first_name: '', last_name: '', mobile: '', wing: '', flat_no: '',
        birth_year: '', gender: '', expertise: ''
      });
      removeAddPhoto();
      setShowAddForm(false);

      // Select the newly added player
      selectPlayer(res.player);

    } catch (err) {
      setAddError("Error adding player: " + err.message);
    }
    setAddLoading(false);
  }

  function clearSelection() {
    setSearchText('');
    setSelectedPlayer(null);
    setProfileData(null);
  }

  function getInitials(name) {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '0' }}>
      {/* Back Link */}
      <Link
        to="/admin"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
        }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Page Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            className="eyebrow"
            style={{
              color: 'var(--accent-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            MANAGE PALLADIO COMMUNITY
          </p>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>Global Player Profiles</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Search and explore player stats across all tournaments and sports.
          </p>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Register Player
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddGlobalPlayerSubmit} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>Register New Player</h4>
            <button type="button" onClick={() => { setShowAddForm(false); setAddError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">First Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="form-input" placeholder="First name" value={addFormData.first_name} onChange={e => setAddFormData({ ...addFormData, first_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="form-input" placeholder="Last name" value={addFormData.last_name} onChange={e => setAddFormData({ ...addFormData, last_name: e.target.value })} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Mobile Number <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="tel" pattern="\d{10}" title="10 digit mobile number" className="form-input" placeholder="e.g. 9876543210" value={addFormData.mobile} onChange={e => setAddFormData({ ...addFormData, mobile: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Birth Year <span style={{ color: '#ef4444' }}>*</span></label>
              <select className="form-input" value={addFormData.birth_year} onChange={e => setAddFormData({ ...addFormData, birth_year: e.target.value })} required>
                <option value="" disabled>Select Year</option>
                {birthYearsList.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender <span style={{ color: '#ef4444' }}>*</span></label>
              <select className="form-input" value={addFormData.gender} onChange={e => setAddFormData({ ...addFormData, gender: e.target.value })} required>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Wing <span style={{ color: '#ef4444' }}>*</span></label>
              <select className="form-input" value={addFormData.wing} onChange={e => setAddFormData({ ...addFormData, wing: e.target.value })} required>
                <option value="">Select Wing</option>
                {'ABCDE'.split('').map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Flat No <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="form-input" placeholder="e.g. 101" value={addFormData.flat_no} onChange={e => setAddFormData({ ...addFormData, flat_no: e.target.value })} required />
            </div>
          </div>



          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Photo (Optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => addFileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
              >
                <Camera size={16} /> Choose Photo
              </button>
              <input
                type="file"
                accept="image/*"
                ref={addFileInputRef}
                style={{ display: 'none' }}
                onChange={handleAddPhotoChange}
              />
              {addPhotoPreview && (
                <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-primary)' }}>
                  <img src={addPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={removeAddPhoto} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {addError && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {addError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Registering...' : 'Register Player'}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <div
          ref={searchRef}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={18}
            color="var(--text-secondary)"
            style={{ position: 'absolute', left: '1rem', zIndex: 2, pointerEvents: 'none' }}
          />
          <input
            className="form-input"
            style={{
              paddingLeft: '2.75rem',
              paddingRight: selectedPlayer ? '2.5rem' : '1rem',
              fontSize: '1rem',
              width: '100%',
              background: 'rgba(30, 41, 59, 0.8)',
              borderColor: showDropdown ? 'var(--accent-primary)' : 'var(--glass-border)',
              transition: 'border-color 0.2s ease',
            }}
            placeholder={loading ? 'Loading players...' : `Search ${allPlayers.length} players...`}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setShowDropdown(true);
              if (selectedPlayer) {
                setSelectedPlayer(null);
                setProfileData(null);
              }
            }}
            onFocus={() => setShowDropdown(true)}
            disabled={loading}
          />
          {selectedPlayer && (
            <button
              onClick={clearSelection}
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && !selectedPlayer && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.25rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '320px',
              overflowY: 'auto',
              zIndex: 50,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            {filteredPlayers.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                }}
              >
                No players found
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <button
                  key={player.key}
                  onClick={() => selectPlayer(player)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  {/* Mini avatar */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {getInitials(player.name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{player.name}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Profile Loading */}
      {profileLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="pulse" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
            Loading profile...
          </div>
        </div>
      )}

      {/* Player Profile */}
      {profileData && !profileLoading && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Header Card */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Banner */}
            <div
              style={{
                height: '100px',
                background:
                  'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(167, 139, 250, 0.25), rgba(244, 114, 182, 0.15))',
                position: 'relative',
              }}
            >
              {/* Decorative orbs */}
              <div
                style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '20%',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Avatar + Name */}
            <div
              style={{
                padding: '0 2rem 1.75rem',
                marginTop: '-55px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  border: '4px solid var(--bg-card)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {profileData.photo_url ? (
                  <img
                    src={profileData.photo_url}
                    alt={profileData.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '2.4rem',
                      fontWeight: 'bold',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {getInitials(profileData.name)}
                  </span>
                )}
              </div>
              <div style={{ paddingBottom: '0.25rem' }}>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>{profileData.name}</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {profileData.gender || ''}
                  {profileData.gender && profileData.age ? ' · ' : ''}
                  {profileData.age ? `Age ${profileData.age}` : ''}
                </p>
                {profileData.mobile && (
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    📱 {profileData.mobile}
                  </p>
                )}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignSelf: 'center' }}>
                <button className="btn btn-outline" onClick={handleEditClick} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <Edit size={16} /> Edit Profile
                </button>
                <button className="btn" onClick={() => setShowDeleteConfirm(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>

            </div>
          </div>

          {/* Sport Cards */}
          {Object.keys(profileData.sports || {}).length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <User size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
              <h3>No Sport Stats Yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                This player hasn't participated in any completed tournaments yet.
              </p>
            </div>
          ) : (
            Object.entries(profileData.sports).map(([sport, data]) => (
              <SportCard key={sport} sportName={sport} sportData={data} />
            ))
          )}
        </div>
      )}

      {/* Empty state when nothing is selected */}
      {!selectedPlayer && !profileLoading && !loading && (
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(30, 41, 59, 0.4)',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <Search size={36} color="var(--accent-primary)" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem' }}>Search for a Player</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
            Use the search bar above to find a player and view their detailed statistics across all
            tournaments and sports.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem',
        }} onClick={() => setIsEditing(false)}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', width: '100%', background: 'var(--bg-secondary)', backdropFilter: 'none', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Edit Player Profile</h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  border: '2px solid var(--glass-border)'
                }}>
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={32} color="var(--text-secondary)" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    <Camera size={16} /> Upload Photo
                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  </label>
                  {editPhotoPreview && (
                    <button type="button" onClick={removePhoto} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name (Read-only)</label>
                  <input type="text" className="form-input" value={editFormData.first_name || ''} disabled style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name (Read-only)</label>
                  <input type="text" className="form-input" value={editFormData.last_name || ''} disabled style={{ opacity: 0.7 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Birth Year</label>
                  <select className="form-input" value={editFormData.birth_year || ''} onChange={e => setEditFormData({ ...editFormData, birth_year: e.target.value })}>
                    <option value="" disabled>Select Year</option>
                    {birthYearsList.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-input" value={editFormData.gender || ''} onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Junior">Junior</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Wing</label>
                  <select className="form-input" value={editFormData.wing || ''} onChange={e => setEditFormData({ ...editFormData, wing: e.target.value })}>
                    <option value="">Select</option>
                    {'ABCDE'.split('').map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Flat No</label>
                  <input type="text" className="form-input" value={editFormData.flat_no || ''} onChange={e => setEditFormData({ ...editFormData, flat_no: e.target.value })} />
                </div>
              </div>

              <h4 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--text-secondary)' }}>Sports Expertise</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {Object.keys(editFormData.sports_expertise || {}).map(sport => (
                  <div key={sport} className="form-group">
                    <label className="form-label">{sport} Expertise</label>
                    <select className="form-input" value={editFormData.sports_expertise[sport] || ''} onChange={e => setEditFormData({
                      ...editFormData,
                      sports_expertise: {
                        ...editFormData.sports_expertise,
                        [sport]: e.target.value
                      }
                    })}>
                      <option value="">Select</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                  <Save size={18} /> {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem',
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '400px', width: '100%', background: 'var(--bg-secondary)', backdropFilter: 'none' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="var(--accent-danger)" />
              <h3 style={{ margin: 0 }}>Delete Global Profile</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>{profileData?.name}</strong>'s global profile? This will not remove them from any individual tournaments they are already part of.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }} onClick={handleDeleteProfile}>
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
