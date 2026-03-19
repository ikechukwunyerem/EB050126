// src/pages/Checkout/CheckoutPage.jsx
// POST /api/orders/checkout/          → creates Order
// POST /api/payment/paystack/initialize/ → { authorization_url, reference }
// GET  /api/auth/addresses/           → user addresses

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaMapMarkerAlt, FaPlus, FaLock, FaArrowRight } from 'react-icons/fa';

import { getAddresses, createAddress } from '../../api/auth';
import { checkout }                    from '../../api/orders';
import { initializeOrderPayment }      from '../../api/payments';
import { getCart }                     from '../../api/cart';
import { useCartStore }                from '../../store/cartStore';
import { toast }                       from '../../components/ui/Toast/Toast';
import Button                          from '../../components/ui/Button/Button';
import FormField                       from '../../components/forms/FormField';
import Spinner                         from '../../components/ui/Spinner/Spinner';
import { formatNGN }                   from '../../utils/formatCurrency';
import styles from './CheckoutPage.module.css';
import SEO from '../../components/seo/SEO';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { setCart, items, grand_total } = useCartStore();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm,   setShowAddressForm]   = useState(false);
  const [newAddress, setNewAddress] = useState({
    recipient_name: '', address_line1: '', address_line2: '',
    city: '', state_province_county: '', postal_code: '',
    country: 'Nigeria', phone_number: '', address_type: 'shipping',
    is_default_shipping: false,
  });
  const [addrErrors, setAddrErrors] = useState({});

  // Fetch cart and addresses
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  getCart,
    onSuccess: (d) => setCart(d),
  });
  const cartItems  = cartData?.items || items || [];
  const total      = cartData?.grand_total || grand_total || '0.00';
  const hasPhysical = cartItems.some((i) => i.product_type === 'physical');

  const { data: addresses = [], isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn:  getAddresses,
    staleTime: 5 * 60 * 1000,
    onSuccess: (list) => {
      if (!selectedAddressId && list.length > 0) {
        const def = list.find((a) => a.is_default_shipping) || list[0];
        setSelectedAddressId(def.id);
      }
    },
  });

  // Add new address
  const addAddrMutation = useMutation({
    mutationFn: (data) => createAddress(data),
    onSuccess: (addr) => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(addr.id);
      setShowAddressForm(false);
      setNewAddress({ recipient_name: '', address_line1: '', address_line2: '', city: '', state_province_county: '', postal_code: '', country: 'Nigeria', phone_number: '', address_type: 'shipping', is_default_shipping: false });
      toast.success('Address added!');
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (data && typeof data === 'object') setAddrErrors(data);
      else toast.error('Could not save address.');
    },
  });

  const validateAddress = () => {
    const errs = {};
    if (!newAddress.recipient_name.trim()) errs.recipient_name = 'Required.';
    if (!newAddress.address_line1.trim())  errs.address_line1  = 'Required.';
    if (!newAddress.city.trim())           errs.city           = 'Required.';
    setAddrErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!validateAddress()) return;
    addAddrMutation.mutate(newAddress);
  };

  // Checkout flow: create order → init payment → redirect
  const [checkoutStep, setCheckoutStep] = useState('idle'); // idle | ordering | paying

  const handleCheckout = async () => {
    if (hasPhysical && !selectedAddressId) {
      toast.warning('Please select or add a delivery address.');
      return;
    }
    setCheckoutStep('ordering');
    try {
      const order = await checkout(hasPhysical ? selectedAddressId : undefined);
      setCheckoutStep('paying');
      const payData = await initializeOrderPayment(order.order_number);
      if (payData?.authorization_url) {
        window.location.href = payData.authorization_url;
      } else {
        throw new Error('No authorization URL returned.');
      }
    } catch (err) {
      setCheckoutStep('idle');
      const msg = err?.response?.data?.error
        || err?.response?.data?.errors?.[0]
        || err?.response?.data?.detail
        || 'Checkout failed. Please try again.';
      toast.error(msg);
    }
  };

  if (cartLoading) return (
    <div className={styles.page}>
      <SEO
        title="Checkout"
        description="Complete your Efiko Education purchase."
        noindex
      />
<div className="container"><Spinner fullPage message="Loading checkout…" /></div></div>
  );

  if (cartItems.length === 0) {
    return (
      <div className={styles.page}><div className="container">
        <div className={styles.empty}>
          <h2>Your cart is empty</h2>
          <Link to="/products">Go to Shop</Link>
        </div>
      </div></div>
    );
  }

  const isBusy = checkoutStep !== 'idle' || addAddrMutation.isPending;

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Checkout</h1>

        <div className={styles.layout}>

          {/* Left col */}
          <div className={styles.leftCol}>

            {/* Delivery address — only needed if cart has physical items */}
            {hasPhysical && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <FaMapMarkerAlt aria-hidden="true" /> Delivery Address
                </h2>

                {addrLoading ? <Spinner size="md" /> : (
                  <>
                    <div className={styles.addressList}>
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`${styles.addressCard} ${selectedAddressId === addr.id ? styles.addressCardSelected : ''}`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={addr.id}
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className={styles.addrRadio}
                          />
                          <div className={styles.addrDetails}>
                            <p className={styles.addrName}>{addr.recipient_name}</p>
                            <p className={styles.addrLine}>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</p>
                            <p className={styles.addrLine}>{addr.city}{addr.state_province_county ? `, ${addr.state_province_county}` : ''} {addr.postal_code}</p>
                            <p className={styles.addrLine}>{addr.country}</p>
                            {addr.phone_number && <p className={styles.addrLine}>{addr.phone_number}</p>}
                          </div>
                          {addr.is_default_shipping && (
                            <span className={styles.defaultBadge}>Default</span>
                          )}
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={styles.addAddrBtn}
                      onClick={() => setShowAddressForm((p) => !p)}
                    >
                      <FaPlus aria-hidden="true" />
                      {showAddressForm ? 'Cancel' : 'Add New Address'}
                    </button>

                    {showAddressForm && (
                      <form className={styles.addrForm} onSubmit={handleAddAddress}>
                        <div className={styles.addrFormGrid}>
                          <FormField id="recipient_name" label="Full name" value={newAddress.recipient_name} onChange={(e) => setNewAddress((p) => ({ ...p, recipient_name: e.target.value }))} error={addrErrors.recipient_name} required disabled={isBusy} />
                          <FormField id="phone_number"   label="Phone"     value={newAddress.phone_number}   onChange={(e) => setNewAddress((p) => ({ ...p, phone_number:   e.target.value }))} error={addrErrors.phone_number}   disabled={isBusy} />
                          <FormField id="address_line1"  label="Address"   value={newAddress.address_line1}  onChange={(e) => setNewAddress((p) => ({ ...p, address_line1:  e.target.value }))} error={addrErrors.address_line1}  required disabled={isBusy} className={styles.fullWidth} />
                          <FormField id="city"           label="City"      value={newAddress.city}           onChange={(e) => setNewAddress((p) => ({ ...p, city:           e.target.value }))} error={addrErrors.city}           required disabled={isBusy} />
                          <FormField id="state"          label="State"     value={newAddress.state_province_county} onChange={(e) => setNewAddress((p) => ({ ...p, state_province_county: e.target.value }))} disabled={isBusy} />
                        </div>
                        <label className={styles.defaultCheck}>
                          <input type="checkbox" checked={newAddress.is_default_shipping} onChange={(e) => setNewAddress((p) => ({ ...p, is_default_shipping: e.target.checked }))} />
                          Set as default shipping address
                        </label>
                        <Button type="submit" size="sm" isLoading={addAddrMutation.isPending} disabled={isBusy}>
                          Save Address
                        </Button>
                      </form>
                    )}
                  </>
                )}
              </section>
            )}

            {/* Order items */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Order Items</h2>
              <ul className={styles.orderItems}>
                {cartItems.map((item) => (
                  <li key={item.id} className={styles.orderItem}>
                    <span className={styles.orderItemName}>{item.product_name}</span>
                    <span className={styles.orderItemQty}>× {item.quantity}</span>
                    <span className={styles.orderItemTotal}>
                      {formatNGN(item.subtotal ?? parseFloat(item.product_price) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Summary sidebar */}
          <aside className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Payment Summary</h2>
              <div className={styles.summaryLine}>
                <span>Items ({cartItems.length})</span>
                <span>{formatNGN(total)}</span>
              </div>
              <div className={`${styles.summaryLine} ${styles.summaryTotal}`}>
                <span>Total</span>
                <strong>{formatNGN(total)}</strong>
              </div>

              <Button
                fullWidth
                size="lg"
                rightIcon={<FaArrowRight />}
                onClick={handleCheckout}
                isLoading={isBusy}
                disabled={isBusy}
              >
                {checkoutStep === 'ordering' ? 'Creating order…'
                 : checkoutStep === 'paying'  ? 'Redirecting to Paystack…'
                 : 'Pay with Paystack'}
              </Button>

              <div className={styles.secureNote}>
                <FaLock aria-hidden="true" /> Secured by Paystack
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
