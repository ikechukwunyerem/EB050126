// src/pages/Dashboard/AddressBook.jsx
// GET    /api/auth/addresses/
// POST   /api/auth/addresses/
// PATCH  /api/auth/addresses/:id/
// DELETE /api/auth/addresses/:id/

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaEdit, FaTrashAlt, FaMapMarkerAlt, FaCheck } from 'react-icons/fa';

import { getAddresses, createAddress, updateAddress, deleteAddress } from '../../api/auth';
import { toast }     from '../../components/ui/Toast/Toast';
import Button        from '../../components/ui/Button/Button';
import FormField     from '../../components/forms/FormField';
import Spinner       from '../../components/ui/Spinner/Spinner';
import Modal         from '../../components/ui/Modal/Modal';
import styles from './Dashboard.module.css';
import SEO from '../../components/seo/SEO';

const BLANK = {
  recipient_name: '', address_line1: '', address_line2: '', city: '',
  state_province_county: '', postal_code: '', country: 'Nigeria',
  phone_number: '', address_type: 'shipping',
  is_default_shipping: false, is_default_billing: false,
};

export default function AddressBook() {
  const qc = useQueryClient();
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingAddr, setEditingAddr] = useState(null); // null = new
  const [formData,    setFormData]    = useState(BLANK);
  const [formErrors,  setFormErrors]  = useState({});

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn:  getAddresses,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['addresses'] });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingAddr ? updateAddress(editingAddr.id, data) : createAddress(data),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success(editingAddr ? 'Address updated!' : 'Address added!');
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (data && typeof data === 'object') setFormErrors(data);
      else toast.error('Could not save address.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAddress(id),
    onSuccess: () => { invalidate(); toast.success('Address removed.'); },
    onError:   () => toast.error('Could not remove address.'),
  });

  const openNew = () => {
    setEditingAddr(null);
    setFormData(BLANK);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (addr) => {
    setEditingAddr(addr);
    setFormData({
      recipient_name: addr.recipient_name || '',
      address_line1:  addr.address_line1  || '',
      address_line2:  addr.address_line2  || '',
      city:           addr.city           || '',
      state_province_county: addr.state_province_county || '',
      postal_code:    addr.postal_code    || '',
      country:        addr.country        || 'Nigeria',
      phone_number:   addr.phone_number   || '',
      address_type:   addr.address_type   || 'shipping',
      is_default_shipping: addr.is_default_shipping,
      is_default_billing:  addr.is_default_billing,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const set = (field) => (e) => setFormData((p) => ({
    ...p,
    [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  const validate = () => {
    const errs = {};
    if (!formData.recipient_name.trim()) errs.recipient_name = 'Required.';
    if (!formData.address_line1.trim())  errs.address_line1  = 'Required.';
    if (!formData.city.trim())           errs.city           = 'Required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(formData);
  };

  const handleDelete = (addr) => {
    if (!window.confirm(`Remove address for ${addr.recipient_name}?`)) return;
    deleteMutation.mutate(addr.id);
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Address Book"
        description="Manage your delivery addresses."
        noindex
      />

      <div className="container">
        <div className={styles.inner}>
          <header className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}><FaMapMarkerAlt aria-hidden="true" /> Address Book</h1>
              <p className={styles.subtitle}>Manage your shipping and billing addresses.</p>
            </div>
            <Button leftIcon={<FaPlus />} onClick={openNew}>Add Address</Button>
          </header>

          {isLoading ? (
            <Spinner size="md" />
          ) : addresses.length === 0 ? (
            <div className={styles.empty}>
              <FaMapMarkerAlt className={styles.emptyIcon} aria-hidden="true" />
              <h3>No addresses saved</h3>
              <p>Add a delivery address to speed up checkout.</p>
              <button type="button" className={styles.emptyLink} onClick={openNew}>
                Add your first address
              </button>
            </div>
          ) : (
            <div className={styles.addrGrid}>
              {addresses.map((addr) => (
                <div key={addr.id} className={styles.addrCard}>
                  <div className={styles.addrCardBody}>
                    <div className={styles.addrCardName}>{addr.recipient_name}</div>
                    <p className={styles.addrCardLine}>{addr.address_line1}</p>
                    {addr.address_line2 && <p className={styles.addrCardLine}>{addr.address_line2}</p>}
                    <p className={styles.addrCardLine}>{addr.city}{addr.state_province_county ? `, ${addr.state_province_county}` : ''}</p>
                    <p className={styles.addrCardLine}>{addr.country}{addr.postal_code ? ` ${addr.postal_code}` : ''}</p>
                    {addr.phone_number && <p className={styles.addrCardLine}>{addr.phone_number}</p>}
                    <div className={styles.addrBadges}>
                      {addr.is_default_shipping && <span className={styles.addrBadge}>Default Shipping</span>}
                      {addr.is_default_billing  && <span className={styles.addrBadge}>Default Billing</span>}
                    </div>
                  </div>
                  <div className={styles.addrCardActions}>
                    <button type="button" className={styles.addrActionBtn} onClick={() => openEdit(addr)} aria-label="Edit address">
                      <FaEdit aria-hidden="true" /> Edit
                    </button>
                    <button type="button" className={`${styles.addrActionBtn} ${styles.addrDeleteBtn}`}
                      onClick={() => handleDelete(addr)} disabled={deleteMutation.isPending}
                      aria-label="Delete address">
                      <FaTrashAlt aria-hidden="true" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit modal */}
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editingAddr ? 'Edit Address' : 'Add New Address'}
          >
            <form onSubmit={handleSubmit} className={styles.addrForm}>
              <div className={styles.addrFormGrid}>
                <FormField id="modal_recipient" label="Full name" value={formData.recipient_name} onChange={set('recipient_name')} error={formErrors.recipient_name} required disabled={saveMutation.isPending} />
                <FormField id="modal_phone"     label="Phone"     value={formData.phone_number}   onChange={set('phone_number')}   error={formErrors.phone_number}   disabled={saveMutation.isPending} />
                <FormField id="modal_addr1" label="Address line 1" value={formData.address_line1} onChange={set('address_line1')} error={formErrors.address_line1} required disabled={saveMutation.isPending} className={styles.fullWidth} />
                <FormField id="modal_addr2" label="Address line 2 (optional)" value={formData.address_line2} onChange={set('address_line2')} disabled={saveMutation.isPending} className={styles.fullWidth} />
                <FormField id="modal_city"  label="City"  value={formData.city}  onChange={set('city')}  error={formErrors.city}  required disabled={saveMutation.isPending} />
                <FormField id="modal_state" label="State" value={formData.state_province_county} onChange={set('state_province_county')} disabled={saveMutation.isPending} />
                <FormField id="modal_postal"  label="Postal code" value={formData.postal_code}  onChange={set('postal_code')}  disabled={saveMutation.isPending} />
                <FormField id="modal_country" label="Country"     value={formData.country}      onChange={set('country')}      disabled={saveMutation.isPending} />
              </div>
              <div className={styles.addrCheckboxRow}>
                <label className={styles.addrCheckbox}>
                  <input type="checkbox" checked={formData.is_default_shipping} onChange={set('is_default_shipping')} />
                  Set as default shipping address
                </label>
                <label className={styles.addrCheckbox}>
                  <input type="checkbox" checked={formData.is_default_billing} onChange={set('is_default_billing')} />
                  Set as default billing address
                </label>
              </div>
              <div className={styles.modalFooter}>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={saveMutation.isPending} leftIcon={<FaCheck />}>
                  {editingAddr ? 'Save Changes' : 'Add Address'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </div>
    </div>
  );
}
