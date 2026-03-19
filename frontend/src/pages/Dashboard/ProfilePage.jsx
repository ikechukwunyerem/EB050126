// src/pages/Dashboard/ProfilePage.jsx
// GET/PATCH /api/auth/profile/

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCamera, FaUser, FaCheck } from 'react-icons/fa';

import { getProfile, updateProfile } from '../../api/auth';
import { useAuthStore }  from '../../store/authStore';
import { toast }         from '../../components/ui/Toast/Toast';
import Button            from '../../components/ui/Button/Button';
import FormField         from '../../components/forms/FormField';
import Spinner           from '../../components/ui/Spinner/Spinner';
import styles from './Dashboard.module.css';
import SEO from '../../components/seo/SEO';

export default function ProfilePage() {
  const qc         = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileRef    = useRef(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const [fields, setFields] = useState({ first_name: '', last_name: '', about: '', gender: '' });
  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);

  useEffect(() => {
    if (profile) {
      setFields({
        first_name: profile.first_name || '',
        last_name:  profile.last_name  || '',
        about:      profile.about      || '',
        gender:     profile.gender     || '',
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (formData) => updateProfile(formData),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      updateUser({ first_name: data.first_name, last_name: data.last_name, full_name: data.full_name });
      toast.success('Profile updated!');
      setAvatarFile(null);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (data && typeof data === 'object') setErrors(data);
      else toast.error('Could not update profile.');
    },
  });

  const validate = () => {
    const errs = {};
    if (!fields.first_name.trim()) errs.first_name = 'First name is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const fd = new FormData();
    fd.append('first_name', fields.first_name.trim());
    fd.append('last_name',  fields.last_name.trim());
    fd.append('about',      fields.about.trim());
    if (fields.gender) fd.append('gender', fields.gender);
    if (avatarFile)    fd.append('image', avatarFile);
    mutation.mutate(fd);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const set = (field) => (e) => setFields((p) => ({ ...p, [field]: e.target.value }));

  if (isLoading) return <div className={styles.page}><div className="container"><Spinner fullPage message="Loading profile…" /></div></div>;

  const avatarSrc = avatarPreview || profile?.image || null;

  return (
    <div className={styles.page}>
      <SEO
        title="My Profile"
        description="Manage your Efiko Education account profile."
        noindex
      />

      <div className="container">
        <div className={styles.inner}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>My Profile</h1>
            <p className={styles.subtitle}>Update your name, photo, and account details.</p>
          </header>

          <form className={styles.profileForm} onSubmit={handleSubmit}>
            {/* Avatar */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className={styles.avatar}
                    onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <FaUser aria-hidden="true" />
                  </div>
                )}
                <button
                  type="button"
                  className={styles.avatarEditBtn}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change profile photo"
                >
                  <FaCamera aria-hidden="true" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={handleAvatarChange}
                  aria-label="Upload profile photo"
                />
              </div>
              <div className={styles.avatarInfo}>
                <p className={styles.avatarName}>{profile?.full_name || 'Your Name'}</p>
                <p className={styles.avatarEmail}>{profile?.email}</p>
                <p className={styles.avatarHint}>JPG, PNG or WEBP. Max 5MB.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <FormField id="first_name" label="First name" value={fields.first_name} onChange={set('first_name')} error={errors.first_name} required disabled={mutation.isPending} autoComplete="given-name" />
              <FormField id="last_name"  label="Last name"  value={fields.last_name}  onChange={set('last_name')}  error={errors.last_name}  disabled={mutation.isPending} autoComplete="family-name" />

              <div className={styles.fullWidth}>
                <label htmlFor="about" className={styles.textareaLabel}>About me</label>
                <textarea
                  id="about"
                  className={styles.textarea}
                  value={fields.about}
                  onChange={set('about')}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us a little about yourself…"
                  disabled={mutation.isPending}
                />
              </div>

              <div>
                <label htmlFor="gender" className={styles.textareaLabel}>Gender</label>
                <div className={styles.selectWrapper}>
                  <select id="gender" className={styles.select} value={fields.gender} onChange={set('gender')} disabled={mutation.isPending}>
                    <option value="">Prefer not to say</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                    <option value="P">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" isLoading={mutation.isPending} leftIcon={<FaCheck />}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
