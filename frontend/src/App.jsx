
import { useEffect, useMemo, useState } from 'react';
import './index.css';

const API =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const money = n =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format((n || 0) / 100);

const pretty = s =>
  (s || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('fixora_token') || ''
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fixora_user'));
    } catch {
      return null;
    }
  });

  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('home');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Login and registration state
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER'
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Booking state
  const [form, setForm] = useState({
    serviceCode: 'PLUMBER',
    description: '',
    address: '',
    city: 'Hyderabad',
    scheduledAt: '',
    customRequest: false,
    customPrice: '',
    quoteNote: ''
  });

  const [chatBooking, setChatBooking] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState({});
  const [review, setReview] = useState({});
  const [arrivalCodes, setArrivalCodes] = useState({});

  // API helper
  const call = async (path, opts = {}) => {
    const r = await fetch(API + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      }
    });

    let d = null;

    try {
      d = await r.json();
    } catch {
      // Response may not contain JSON.
    }

    if (!r.ok) {
      throw new Error(
        d?.error || d?.message || `Request failed (${r.status})`
      );
    }

    return d;
  };

  const flash = s => {
    setNotice(s);
    setTimeout(() => setNotice(''), 4500);
  };

  const refresh = async () => {
    try {
      const [sv, bk] = await Promise.all([
        call('/services'),
        call('/bookings')
      ]);

      setServices(sv);
      setBookings(bk);
    } catch (e) {
      flash(e.message);
    }
  };

  useEffect(() => {
    call('/services')
      .then(setServices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (token && user) {
      refresh();
    }
  }, [token, user]);

  const logout = () => {
    localStorage.removeItem('fixora_token');
    localStorage.removeItem('fixora_user');

    setToken('');
    setUser(null);
    setBookings([]);
    setTab('home');

    setAuthMode('login');
    setAuth({
      name: '',
      email: '',
      password: '',
      role: 'CUSTOMER'
    });

    setConfirmPassword('');
    setOtpCode('');
    setOtpSent(false);
  };

  // LOGIN + OTP REGISTRATION
  const submitAuth = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      // STEP 1: Normal login
      if (authMode === 'login') {
        const d = await call('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: auth.email.trim(),
            password: auth.password
          })
        });

        localStorage.setItem('fixora_token', d.token);
        localStorage.setItem('fixora_user', JSON.stringify(d.user));

        setToken(d.token);
        setUser(d.user);
        setTab('home');

        flash('Welcome to Fixora, ' + d.user.name + '!');
        return;
      }

      // STEP 2: Send OTP to Gmail
      if (!otpSent) {
        if (!auth.name.trim()) {
          throw new Error('Please enter your full name.');
        }

        if (!auth.email.trim()) {
          throw new Error('Please enter your email address.');
        }

        if (!auth.email.toLowerCase().endsWith('@gmail.com')) {
          throw new Error('Please use a Gmail address.');
        }

        if (auth.password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        if (auth.password.length < 8) {
          throw new Error(
            'Password must contain at least 8 characters.'
          );
        }

        const d = await call('/auth/register/send-otp', {
          method: 'POST',
          body: JSON.stringify({
            ...auth,
            name: auth.name.trim(),
            email: auth.email.trim().toLowerCase()
          })
        });

        setAuth(prev => ({
          ...prev,
          email: prev.email.trim().toLowerCase()
        }));

        setOtpSent(true);
        setOtpCode('');

        flash(d.message || 'OTP sent. Check your Gmail inbox.');
        return;
      }

      // STEP 3: Verify OTP and create the account
      if (!/^\d{6}$/.test(otpCode)) {
        throw new Error('Please enter the 6-digit OTP.');
      }

      const d = await call('/auth/register/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: auth.email.trim().toLowerCase(),
          code: otpCode
        })
      });

      // Login automatically after successful verification
      localStorage.setItem('fixora_token', d.token);
      localStorage.setItem('fixora_user', JSON.stringify(d.user));

      setToken(d.token);
      setUser(d.user);
      setOtpSent(false);
      setConfirmPassword('');
      setOtpCode('');
      setTab('home');

      flash('Welcome to Fixora, ' + d.user.name + '!');

    } catch (e) {
      flash(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset registration if user wants to go back
  const backToRegistration = () => {
    setOtpSent(false);
    setOtpCode('');
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setOtpSent(false);
    setOtpCode('');
    setConfirmPassword('');

    setAuth(prev => ({
      ...prev,
      password: ''
    }));
  };

  // CREATE BOOKING
  const createBooking = async e => {
    e.preventDefault();

    if (!form.scheduledAt) {
      flash('Please choose a date and time.');
      return;
    }

    try {
      const svc = services.find(
        s => s.code === form.serviceCode
      );

      await call('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceCode: form.serviceCode,
          description: form.description,
          address: form.address,
          city: form.city,
          scheduledAt: form.scheduledAt,
          customRequest: form.customRequest,
          agreedPricePaise: form.customRequest
            ? Math.round(Number(form.customPrice) * 100)
            : svc?.pricePaise,
          quoteNote: form.quoteNote
        })
      });

      flash('Booking created successfully.');

      setForm(prev => ({
        ...prev,
        description: '',
        address: '',
        customPrice: '',
        quoteNote: ''
      }));

      setTab('bookings');
      await refresh();

    } catch (e) {
      flash(e.message);
    }
  };

  // BOOKING ACTIONS
  const action = async (id, path, method = 'POST', body = {}) => {
    try {
      await call(path, {
        method,
        body: JSON.stringify(body)
      });

      flash('Update saved.');
      await refresh();

    } catch (e) {
      flash(e.message);
    }
  };

  // CHAT
  const loadMessages = async id => {
    setChatBooking(id);
    setTab('messages');

    if (!id) {
      setMessages([]);
      return;
    }

    try {
      setMessages(
        await call(`/bookings/${id}/messages`)
      );
    } catch (e) {
      flash(e.message);
    }
  };

  const sendMessage = async e => {
    e.preventDefault();

    try {
      await call(`/bookings/${chatBooking}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: message })
      });

      setMessage('');

      setMessages(
        await call(`/bookings/${chatBooking}/messages`)
      );

    } catch (e) {
      flash(e.message);
    }
  };

  // REVIEWS
  const submitReview = async id => {
    if (!review[id]) {
      flash('Please select a rating first.');
      return;
    }

    try {
      await call(`/bookings/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          stars: Number(review[id]),
          comment: ''
        })
      });

      flash('Thank you for your review.');
      await refresh();

    } catch (e) {
      flash(e.message);
    }
  };

  const serviceByCode = code =>
    services.find(s => s.code === code);

  const mine = useMemo(
    () =>
      bookings.filter(b =>
        user?.role === 'SERVICER'
          ? b.status === 'PENDING_ASSIGNMENT' ||
            b.servicer?.id === `FXS-${user.id}`
          : true
      ),
    [bookings, user]
  );

  return (
    <div className="shell">
      <header className="top">
        <a
          className="brand"
          onClick={() => setTab('home')}
        >
          <span className="mark">f</span>
          <span>
            fixora
            <small>HOME SERVICES, SIMPLIFIED</small>
          </span>
        </a>

        {user ? (
          <div className="topright">
            <span className="identity">
              {user.name} <b>{user.role}</b>
            </span>

            <button className="btn ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        ) : (
          <span className="live">● Connected app</span>
        )}
      </header>

      {notice && (
        <div className="notice">
          {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}

      {!user ? (
        // AUTHENTICATION SCREEN
        <main className="auth-layout">
          <section className="hero">
            <div className="eyebrow">
              A BETTER WAY TO CARE FOR YOUR HOME
            </div>

            <h1>
              Home fixes,
              <br />
              without the fuss.
            </h1>

            <p>
              Book trusted help for everyday jobs, agree on
              the price, and follow your booking from
              acceptance to completion.
            </p>

            <div className="hero-points">
              <span>✓ Clear prices</span>
              <span>✓ Booking updates</span>
              <span>✓ Arrival verification</span>
            </div>
          </section>

          <form
            className="panel auth"
            onSubmit={submitAuth}
          >
            <div className="eyebrow">
              YOUR FIXORA ACCOUNT
            </div>

            <h2>
              {authMode === 'login'
                ? 'Welcome back'
                : otpSent
                  ? 'Verify your Gmail'
                  : 'Create your account'}
            </h2>

            <p className="muted">
              {authMode === 'login'
                ? 'Sign in to manage your bookings.'
                : otpSent
                  ? 'Enter the 6-digit code sent to your Gmail address.'
                  : 'Register as a customer or service professional.'}
            </p>

            {/* NAME AND ACCOUNT TYPE */}
            {authMode === 'register' && !otpSent && (
              <>
                <label>
                  Full name
                  <input
                    type="text"
                    required
                    maxLength="100"
                    value={auth.name}
                    onChange={e =>
                      setAuth({
                        ...auth,
                        name: e.target.value
                      })
                    }
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </label>

                <label>
                  Account type
                  <select
                    value={auth.role}
                    onChange={e =>
                      setAuth({
                        ...auth,
                        role: e.target.value
                      })
                    }
                  >
                    <option value="CUSTOMER">
                      Customer
                    </option>

                    <option value="SERVICER">
                      Service professional
                    </option>
                  </select>
                </label>
              </>
            )}

            {/* EMAIL: LOCKED AFTER OTP IS SENT */}
            <label>
              Gmail address
              <input
                type="email"
                required
                maxLength="190"
                value={auth.email}
                readOnly={authMode === 'register' && otpSent}
                onChange={e =>
                  setAuth({
                    ...auth,
                    email: e.target.value
                  })
                }
                placeholder="you@gmail.com"
                autoComplete="email"
              />
            </label>

            {/* PASSWORD FIELDS */}
            {(authMode === 'login' ||
              (authMode === 'register' && !otpSent)) && (
              <>
                <label>
                  Password
                  <input
                    type="password"
                    minLength="8"
                    maxLength="100"
                    required
                    value={auth.password}
                    onChange={e =>
                      setAuth({
                        ...auth,
                        password: e.target.value
                      })
                    }
                    placeholder="At least 8 characters"
                    autoComplete={
                      authMode === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                  />
                </label>

                {authMode === 'register' && (
                  <label>
                    Re-enter password
                    <input
                      type="password"
                      minLength="8"
                      maxLength="100"
                      required
                      value={confirmPassword}
                      onChange={e =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Enter password again"
                      autoComplete="new-password"
                    />
                  </label>
                )}
              </>
            )}

            {/* OTP FIELD */}
            {authMode === 'register' && otpSent && (
              <>
                <label>
                  Email verification code
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength="6"
                    maxLength="6"
                    required
                    value={otpCode}
                    onChange={e =>
                      setOtpCode(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      )
                    }
                    placeholder="Enter 6-digit OTP"
                  />
                </label>

                <p className="hint">
                  Check your Gmail inbox, including the Spam
                  folder. Your OTP expires in 5 minutes.
                </p>
              </>
            )}

            {/* MAIN BUTTON */}
            <button
              className="btn primary full"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Sign in'
                  : otpSent
                    ? 'Verify OTP & Create Account'
                    : 'Send OTP'}
            </button>

            {/* LOGIN / REGISTER SWITCH */}
            <p className="switch">
              {authMode === 'login'
                ? 'New to Fixora?'
                : 'Already registered?'}{' '}

              <button
                type="button"
                onClick={switchAuthMode}
              >
                {authMode === 'login'
                  ? 'Create an account'
                  : 'Sign in'}
              </button>
            </p>

            {/* RETURN TO REGISTRATION */}
            {authMode === 'register' && otpSent && (
              <button
                type="button"
                className="textbtn"
                onClick={backToRegistration}
              >
                ← Back to registration
              </button>
            )}

            <p className="hint">
              Admin accounts are created by the deployment
              owner; public admin registration is disabled.
            </p>
          </form>
        </main>
      ) : (
        // LOGGED-IN WORKSPACE
        <main className="workspace">
          <aside className="nav">
            <div className="navtitle">WORKSPACE</div>

            {[
              ['home', '⌂', 'Overview'],
              [
                'bookings',
                '▤',
                user.role === 'SERVICER'
                  ? 'Jobs & bookings'
                  : 'My bookings'
              ],
              ...(user.role === 'CUSTOMER'
                ? [['new', '＋', 'Book a service']]
                : []),
              ['messages', '◌', 'Messages'],
              ...(user.role === 'ADMIN'
                ? [['admin', '▦', 'Admin summary']]
                : [])
            ].map(([id, ic, label]) => (
              <button
                key={id}
                className={tab === id ? 'selected' : ''}
                onClick={() => setTab(id)}
              >
                <span>{ic}</span>
                {label}
              </button>
            ))}

            <div className="navfoot">
              <b>Your home, cared for.</b>
              <p>Clear pricing. Reliable service.</p>
            </div>
          </aside>

          <section className="content">
            <div className="pagehead">
              <div>
                <div className="eyebrow">
                  FIXORA / {user.role}
                </div>

                <h1>
                  {{
                    home: 'Good day, ' + user.name,
                    bookings:
                      user.role === 'SERVICER'
                        ? 'Jobs and bookings'
                        : 'Your bookings',
                    new: 'Book a service',
                    messages: 'Booking messages',
                    admin: 'Admin summary'
                  }[tab] || 'Fixora'}
                </h1>
              </div>

              <button
                className="btn ghost"
                onClick={refresh}
              >
                ↻ Refresh
              </button>
            </div>

            {/* HOME DASHBOARD */}
            {tab === 'home' && (
              <>
                <div className="banner">
                  <div>
                    <span className="eyebrow">
                      YOUR LOCAL HOME-CARE PARTNER
                    </span>

                    <h2>
                      {user.role === 'SERVICER'
                        ? 'Find jobs that fit your schedule.'
                        : user.role === 'ADMIN'
                          ? 'Manage the Fixora service network.'
                          : 'Home fixes, made simpler.'}
                    </h2>

                    <p>
                      {user.role === 'CUSTOMER'
                        ? 'Choose a service or describe a custom request. You will see the agreed price before booking.'
                        : 'Manage real bookings and keep customers informed.'}
                    </p>

                    {user.role === 'CUSTOMER' && (
                      <button
                        className="btn light"
                        onClick={() => setTab('new')}
                      >
                        Book a service →
                      </button>
                    )}

                    {user.role === 'SERVICER' && (
                      <button
                        className="btn light"
                        onClick={() => setTab('bookings')}
                      >
                        View available jobs →
                      </button>
                    )}
                  </div>

                  <div className="banner-icon">⌂</div>
                </div>

                <div className="stats">
                  <div className="stat">
                    <small>
                      {user.role === 'SERVICER'
                        ? 'Available jobs'
                        : 'Total bookings'}
                    </small>

                    <strong>
                      {user.role === 'SERVICER'
                        ? mine.filter(
                            b => b.status === 'PENDING_ASSIGNMENT'
                          ).length
                        : bookings.length}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>In progress</small>

                    <strong>
                      {
                        bookings.filter(b =>
                          [
                            'ACCEPTED',
                            'ON_THE_WAY',
                            'ARRIVED',
                            'IN_PROGRESS'
                          ].includes(b.status)
                        ).length
                      }
                    </strong>
                  </div>

                  <div className="stat">
                    <small>Completed</small>

                    <strong>
                      {
                        bookings.filter(
                          b => b.status === 'COMPLETED'
                        ).length
                      }
                    </strong>
                  </div>
                </div>

                <div className="section-title">
                  <div>
                    <span className="eyebrow">
                      SERVICE CATALOG
                    </span>
                    <h2>How can we help?</h2>
                  </div>

                  {user.role === 'CUSTOMER' && (
                    <button
                      className="textbtn"
                      onClick={() => setTab('new')}
                    >
                      All services →
                    </button>
                  )}
                </div>

                <div className="services">
                  {services.map(s => (
                    <button
                      className="service"
                      key={s.code}
                      onClick={() => {
                        if (user.role !== 'CUSTOMER') return;

                        setForm(prev => ({
                          ...prev,
                          serviceCode: s.code,
                          customRequest: false
                        }));

                        setTab('new');
                      }}
                    >
                      <span className="serviceicon">
                        {{
                          PLUMBER: '🔧',
                          ELECTRICIAN: '⚡',
                          CLEANER: '✨',
                          APPLIANCE_REPAIR: '🧰'
                        }[s.code] || '⌂'}
                      </span>

                      <b>{s.name}</b>
                      <small>{s.description}</small>
                      <strong>From {money(s.pricePaise)}</strong>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* NEW BOOKING */}
            {tab === 'new' && user.role === 'CUSTOMER' && (
              <form
                className="panel formpanel"
                onSubmit={createBooking}
              >
                <div className="section-title">
                  <div>
                    <span className="eyebrow">NEW REQUEST</span>
                    <h2>Book a home service</h2>
                  </div>
                </div>

                <div className="toggle">
                  <button
                    type="button"
                    className={
                      !form.customRequest ? 'active' : ''
                    }
                    onClick={() =>
                      setForm(prev => ({
                        ...prev,
                        customRequest: false
                      }))
                    }
                  >
                    Fixed-price package
                  </button>

                  <button
                    type="button"
                    className={
                      form.customRequest ? 'active' : ''
                    }
                    onClick={() =>
                      setForm(prev => ({
                        ...prev,
                        customRequest: true
                      }))
                    }
                  >
                    Custom request
                  </button>
                </div>

                <label>
                  Service category
                  <select
                    value={form.serviceCode}
                    onChange={e =>
                      setForm({
                        ...form,
                        serviceCode: e.target.value
                      })
                    }
                  >
                    {services.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.name} — from {money(s.pricePaise)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Describe the work
                  <textarea
                    required
                    minLength="4"
                    value={form.description}
                    onChange={e =>
                      setForm({
                        ...form,
                        description: e.target.value
                      })
                    }
                    placeholder="Tell us what needs to be done"
                  />
                </label>

                {form.customRequest && (
                  <>
                    <label>
                      Agreed fixed price (₹)
                      <input
                        type="number"
                        min="1"
                        required
                        value={form.customPrice}
                        onChange={e =>
                          setForm({
                            ...form,
                            customPrice: e.target.value
                          })
                        }
                        placeholder="Enter the agreed price"
                      />
                    </label>

                    <label>
                      Price / scope note (optional)
                      <input
                        value={form.quoteNote}
                        onChange={e =>
                          setForm({
                            ...form,
                            quoteNote: e.target.value
                          })
                        }
                        placeholder="What is included in this price?"
                      />
                    </label>

                    <p className="hint">
                      Custom requests must have a fixed price
                      agreed before submission. This MVP records
                      the price you enter; it does not yet
                      provide an in-app quote negotiation flow.
                    </p>
                  </>
                )}

                <div className="two">
                  <label>
                    Service address
                    <input
                      required
                      value={form.address}
                      onChange={e =>
                        setForm({
                          ...form,
                          address: e.target.value
                        })
                      }
                      placeholder="Flat, street, landmark"
                    />
                  </label>

                  <label>
                    City / area
                    <input
                      required
                      value={form.city}
                      onChange={e =>
                        setForm({
                          ...form,
                          city: e.target.value
                        })
                      }
                      placeholder="Hyderabad"
                    />
                  </label>
                </div>

                <label>
                  Appointment date and time
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduledAt}
                    onChange={e =>
                      setForm({
                        ...form,
                        scheduledAt: e.target.value
                      })
                    }
                  />
                </label>

                <div className="priceconfirm">
                  <div>
                    <small>Price to confirm</small>
                    <strong>
                      {form.customRequest
                        ? form.customPrice
                          ? money(
                              Math.round(
                                Number(form.customPrice) * 100
                              )
                            )
                          : 'Enter a price'
                        : money(
                            serviceByCode(form.serviceCode)
                              ?.pricePaise
                          )}
                    </strong>
                  </div>

                  <span>No unapproved extra charges.</span>
                </div>

                <button className="btn primary" type="submit">
                  Confirm booking →
                </button>
              </form>
            )}

            {/* BOOKINGS AND JOBS */}
            {tab === 'bookings' && (
              <div className="bookinglist">
                {mine.length === 0 ? (
                  <div className="panel empty">
                    <h3>No bookings yet</h3>
                    <p>
                      New bookings and job offers appear here.
                    </p>
                  </div>
                ) : (
                  mine.map(b => (
                    <article
                      className="panel booking"
                      key={b.id}
                    >
                      <div className="bookingtop">
                        <div>
                          <span className="bookingid">
                            {b.id}
                          </span>

                          <h3>{b.service}</h3>
                          <p>{b.description}</p>
                        </div>

                        <span
                          className={
                            'status ' + b.status.toLowerCase()
                          }
                        >
                          {pretty(b.status)}
                        </span>
                      </div>

                      <div className="bookingdetails">
                        <span>
                          ⌖ {b.address}, {b.city}
                        </span>

                        <span>
                          ◷{' '}
                          {new Date(
                            b.scheduledAt
                          ).toLocaleString()}
                        </span>

                        <strong>{money(b.pricePaise)}</strong>
                      </div>

                      {b.servicer && (
                        <p className="muted">
                          Assigned professional: {b.servicer.name}
                        </p>
                      )}

                      <div className="actions">
                        {user.role === 'SERVICER' &&
                          b.status === 'PENDING_ASSIGNMENT' && (
                            <button
                              className="btn primary"
                              onClick={() =>
                                action(
                                  b.id,
                                  `/bookings/${b.id}/accept`
                                )
                              }
                            >
                              Accept job
                            </button>
                          )}

                        {user.role === 'SERVICER' &&
                          b.status === 'ACCEPTED' && (
                            <button
                              className="btn primary"
                              onClick={() =>
                                action(
                                  b.id,
                                  `/bookings/${b.id}/status`,
                                  'PATCH',
                                  { status: 'ON_THE_WAY' }
                                )
                              }
                            >
                              On the way
                            </button>
                          )}

                        {user.role === 'SERVICER' &&
                          b.status === 'ON_THE_WAY' && (
                            <>
                              <input
                                className="otpbox"
                                placeholder="Customer OTP"
                                value={otp[b.id] || ''}
                                onChange={e =>
                                  setOtp({
                                    ...otp,
                                    [b.id]: e.target.value
                                  })
                                }
                              />

                              <button
                                className="btn primary"
                                onClick={() =>
                                  action(
                                    b.id,
                                    `/bookings/${b.id}/verify-arrival`,
                                    'POST',
                                    { code: otp[b.id] || '' }
                                  )
                                }
                              >
                                Verify arrival
                              </button>
                            </>
                          )}

                        {user.role === 'SERVICER' &&
                          b.status === 'ARRIVED' && (
                            <button
                              className="btn primary"
                              onClick={() =>
                                action(
                                  b.id,
                                  `/bookings/${b.id}/status`,
                                  'PATCH',
                                  { status: 'IN_PROGRESS' }
                                )
                              }
                            >
                              Start work
                            </button>
                          )}

                        {user.role === 'SERVICER' &&
                          b.status === 'IN_PROGRESS' && (
                            <button
                              className="btn primary"
                              onClick={() =>
                                action(
                                  b.id,
                                  `/bookings/${b.id}/status`,
                                  'PATCH',
                                  { status: 'COMPLETED' }
                                )
                              }
                            >
                              Complete job
                            </button>
                          )}

                        {user.role === 'CUSTOMER' &&
                          b.status === 'PENDING_ASSIGNMENT' && (
                            <button
                              className="btn danger"
                              onClick={() =>
                                action(
                                  b.id,
                                  `/bookings/${b.id}/cancel`
                                )
                              }
                            >
                              Cancel booking
                            </button>
                          )}

                        {user.role === 'CUSTOMER' &&
                          b.status === 'ON_THE_WAY' && (
                            <button
                              className="btn ghost"
                              onClick={async () => {
                                try {
                                  const d = await call(
                                    `/bookings/${b.id}/arrival-code`
                                  );

                                  setArrivalCodes({
                                    ...arrivalCodes,
                                    [b.id]: d.code
                                  });
                                } catch (e) {
                                  flash(e.message);
                                }
                              }}
                            >
                              Show arrival OTP
                              {arrivalCodes[b.id]
                                ? `: ${arrivalCodes[b.id]}`
                                : ''}
                            </button>
                          )}

                        {b.servicer && (
                          <button
                            className="btn ghost"
                            onClick={() => loadMessages(b.id)}
                          >
                            Open chat
                          </button>
                        )}

                        {user.role === 'CUSTOMER' &&
                          b.status === 'COMPLETED' && (
                            <>
                              <select
                                className="reviewselect"
                                value={review[b.id] || ''}
                                onChange={e =>
                                  setReview({
                                    ...review,
                                    [b.id]: e.target.value
                                  })
                                }
                              >
                                <option value="">
                                  Rate service
                                </option>

                                {[5, 4, 3, 2, 1].map(n => (
                                  <option key={n} value={n}>
                                    {n} stars
                                  </option>
                                ))}
                              </select>

                              <button
                                className="btn ghost"
                                onClick={() => submitReview(b.id)}
                              >
                                Submit review
                              </button>
                            </>
                          )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}

            {/* MESSAGES */}
            {tab === 'messages' && (
              <div className="panel chat">
                <label>
                  Choose a booking
                  <select
                    value={chatBooking}
                    onChange={e => loadMessages(e.target.value)}
                  >
                    <option value="">Select booking</option>

                    {bookings
                      .filter(b => b.servicer)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.id} — {b.service}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="messages">
                  {messages.map(m => (
                    <div className="message" key={m.id}>
                      <b>
                        {m.sender}{' '}
                        <small>{m.senderRole}</small>
                      </b>

                      <p>{m.body}</p>

                      <time>
                        {new Date(m.sentAt).toLocaleString()}
                      </time>
                    </div>
                  ))}

                  {!messages.length && (
                    <p className="muted">
                      Choose a booking to load its messages.
                      Chat is available to booking participants.
                    </p>
                  )}
                </div>

                {chatBooking && (
                  <form
                    className="send"
                    onSubmit={sendMessage}
                  >
                    <input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      maxLength="2000"
                      placeholder="Write a message…"
                    />

                    <button
                      className="btn primary"
                      type="submit"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ADMIN */}
            {tab === 'admin' && user.role === 'ADMIN' && (
              <div className="panel">
                <h2>Admin summary</h2>
                <p>Fetch live counts from the secured API.</p>

                <button
                  className="btn primary"
                  onClick={async () => {
                    try {
                      const d = await call('/admin/summary');

                      flash(
                        `Users: ${d.users} · Bookings: ${d.bookings} · Services: ${d.services} · Reviews: ${d.reviews}`
                      );
                    } catch (e) {
                      flash(e.message);
                    }
                  }}
                >
                  Load summary
                </button>

                <p className="hint">
                  Admin user creation is deliberately not public.
                  Configure a trusted admin account before deployment.
                </p>
              </div>
            )}

            <footer>
              © 2026 Fixora · Real API mode · Do not use with
              real customers until deployment hardening and
              OTP delivery are configured.
            </footer>
          </section>
        </main>
      )}
    </div>
  );
}
