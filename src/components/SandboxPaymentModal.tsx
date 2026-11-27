import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  FlaskConical,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import { auth } from '../firebase';
import { BookingRecord, UserProfile } from '../types/cinema';
import { PendingCheckoutPayload } from './BookingModal';
import { QrCodeMatrix } from './QrCodeMatrix';

interface SandboxPaymentModalProps {
  checkout: PendingCheckoutPayload | null;
  user: UserProfile | null;
  onClose: () => void;
  onPaymentSuccess: (booking: BookingRecord) => void;
}

type PaymentTab = 'upi' | 'card' | 'netbanking' | 'wallet';
type SandboxOutcome = 'approve' | 'decline';

export const SandboxPaymentModal: React.FC<SandboxPaymentModalProps> = ({
  checkout,
  user,
  onClose,
  onPaymentSuccess,
}) => {
  const [activeMethod, setActiveMethod] = useState<PaymentTab>('upi');
  const [sandboxOutcome, setSandboxOutcome] = useState<SandboxOutcome>('approve');
  const [upiId, setUpiId] = useState('cinnova@sandbox');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [selectedWallet, setSelectedWallet] = useState('Amazon Pay');
  const [email, setEmail] = useState(user?.email || 'guest@cinnova.app');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (!checkout) return;
    setStep('checkout');
    setConfirmedBooking(null);
    setErrorMsg('');
    setSandboxOutcome('approve');
    if (user?.email) setEmail(user.email);
    if (user?.phone) setPhone(user.phone);
    if (user?.name) setCardName(user.name);
  }, [checkout, user?.email, user?.name, user?.phone]);

  if (!checkout || !user) return null;

  const orderId = `sbx_CN${checkout.movie.id.slice(0, 4).toUpperCase()}8492`;

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const fillSandboxCard = () => {
    setCardNumber('4111 1111 1111 1111');
    setCardExpiry('12/29');
    setCardCvv('123');
    setCardName(user?.name || 'Aarav Sharma');
    setErrorMsg('');
  };

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user || !auth.currentUser) {
      setErrorMsg('Please sign in before completing payment.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address for your digital ticket.');
      return;
    }

    if (activeMethod === 'upi' && !upiId.includes('@')) {
      setErrorMsg('Please enter a valid UPI ID (e.g. success@sandbox).');
      return;
    }

    if (activeMethod === 'card') {
      const rawDigits = cardNumber.replace(/\s/g, '');
      if (rawDigits.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || !cardName.trim()) {
        setErrorMsg('Please enter complete test card details or click "Fill Sandbox Card".');
        return;
      }
    }

    setStep('processing');

    const rawMethodLabel =
      activeMethod === 'upi'
        ? `Sandbox UPI (${upiId.trim()})`
        : activeMethod === 'card'
        ? `Sandbox Card •••• ${cardNumber.slice(-4)}`
        : activeMethod === 'netbanking'
        ? `Sandbox Netbanking (${selectedBank})`
        : `Sandbox Wallet (${selectedWallet})`;

    const methodLabel = rawMethodLabel.slice(0, 60);

    window.setTimeout(() => {
      if (sandboxOutcome === 'decline') {
        setStep('checkout');
        setErrorMsg(
          'Sandbox declined this test transaction. Switch the Sandbox result to "Approve Payment" to complete your booking.'
        );
        return;
      }

      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const booking: BookingRecord = {
        bookingId: `CNV-${randomSuffix}`,
        paymentId: `pay_sbx_${randomSuffix}`,
        movieId: checkout.movie.id,
        movieTitle: checkout.movie.title,
        movieLanguage: checkout.movie.language,
        movieCertification: checkout.movie.certification,
        posterImage: checkout.movie.posterImage,
        city: checkout.city,
        theatreName: checkout.theatre.name,
        theatreArea: checkout.theatre.area,
        dateLabel: checkout.dateLabel,
        showtime: checkout.showtime.time,
        format: checkout.showtime.format,
        screen: checkout.showtime.screen,
        seats: checkout.seats.map((s) => s.id),
        ticketSubtotal: checkout.ticketSubtotal,
        convenienceFee: checkout.convenienceFee,
        gst: checkout.gst,
        totalAmount: checkout.totalAmount,
        paymentMethod: methodLabel,
        bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customerEmail: email.trim(),
      };

      setConfirmedBooking(booking);
      setStep('success');
      onPaymentSuccess(booking);
    }, 1150);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sandbox Payment Gateway"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#070910]/85 p-3 backdrop-blur-xs sm:p-4"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-blue-500/25 dark:bg-[#0D111C]">
        {/* Sandbox Gateway Merchant Header */}
        <div className="flex items-center justify-between border-b border-blue-500/25 bg-[#070910] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lime-300 shadow-sm ring-1 ring-lime-400/50">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold">Sandbox Payment Gateway</h2>
                <span className="text-[11px] font-semibold text-lime-400">
                  Test Environment
                </span>
              </div>
              <p className="font-mono-tabular text-[11px] text-blue-300">
                CinNova Ticketing · {orderId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[10px] text-blue-300 uppercase">Payable</span>
              <span className="font-mono-tabular text-lg font-bold text-lime-400">
                ₹{checkout.totalAmount}
              </span>
            </div>
            {step !== 'processing' && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Sandbox payment gateway"
                className="rounded-lg p-1.5 text-blue-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Step 1: Checkout Form */}
        {step === 'checkout' && (
          <form onSubmit={handlePayNow} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F4F7FC] px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-[#070910]">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#070910] dark:text-slate-100">
                  {checkout.movie.title} ({checkout.showtime.format})
                </p>
                <p className="truncate text-slate-500 dark:text-slate-400">
                  {checkout.theatre.name} · {checkout.dateLabel}, {checkout.showtime.time}
                </p>
              </div>
              <span className="font-mono-tabular font-semibold text-blue-600 dark:text-lime-400">
                Seats: {checkout.seats.map((s) => s.id).join(', ')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Email for QR Ticket
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="font-mono-tabular mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Sandbox Payment Method
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(
                  [
                    { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'netbanking', label: 'Netbanking', icon: Building2 },
                    { id: 'wallet', label: 'Wallets', icon: Wallet },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeMethod === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveMethod(tab.id);
                        setErrorMsg('');
                      }}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:border-lime-400 dark:bg-lime-400/15 dark:text-lime-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#131926] dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-[#F4F7FC] p-4 dark:border-slate-800 dark:bg-[#070910]">
              {activeMethod === 'upi' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Pay via Sandbox UPI ID
                    </span>
                    <button
                      type="button"
                      onClick={() => setUpiId('success@sandbox')}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-lime-400"
                    >
                      Use Sandbox UPI
                    </button>
                  </div>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="success@sandbox"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiId(`${app.toLowerCase().replace(' ', '')}@sandbox`)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-[#131926] dark:text-slate-200 dark:hover:border-lime-400 dark:hover:text-lime-400"
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeMethod === 'card' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Sandbox Test Card
                    </span>
                    <button
                      type="button"
                      onClick={fillSandboxCard}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-lime-400"
                    >
                      Fill Sandbox Card
                    </button>
                  </div>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="Card Number (4111 1111 1111 1111)"
                    className="font-mono-tabular w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className="font-mono-tabular rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                    />
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="CVV"
                      className="font-mono-tabular rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                    />
                  </div>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Cardholder Name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                </div>
              )}

              {activeMethod === 'netbanking' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        selectedBank === bank
                          ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:border-lime-400 dark:bg-lime-400/15 dark:text-lime-400'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#131926] dark:text-slate-200'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              )}

              {activeMethod === 'wallet' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {['Amazon Pay', 'Mobikwik', 'Freecharge', 'Airtel Money'].map((wallet) => (
                    <button
                      key={wallet}
                      type="button"
                      onClick={() => setSelectedWallet(wallet)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        selectedWallet === wallet
                          ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:border-lime-400 dark:bg-lime-400/15 dark:text-lime-400'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#131926] dark:text-slate-200'
                      }`}
                    >
                      {wallet}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sandbox Gateway Simulation Outcome */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F4F7FC] px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#070910]">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Sandbox Response
              </span>
              <div className="flex items-center gap-1.5 rounded-lg bg-white p-1 dark:bg-[#131926]">
                <button
                  type="button"
                  onClick={() => {
                    setSandboxOutcome('approve');
                    setErrorMsg('');
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    sandboxOutcome === 'approve'
                      ? 'bg-blue-600 text-white dark:bg-lime-400 dark:text-[#070910]'
                      : 'text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Approve Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSandboxOutcome('decline');
                    setErrorMsg('');
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    sandboxOutcome === 'decline'
                      ? 'bg-amber-600 text-white dark:bg-amber-400 dark:text-[#070910]'
                      : 'text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Simulate Decline
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
            >
              <Lock className="h-4 w-4" />
              <span>Authorize ₹{checkout.totalAmount} in Sandbox</span>
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-lime-500 dark:text-lime-400" />
              <span>Sandbox Gateway · Simulated checkout with zero real charges</span>
            </div>
          </form>
        )}

        {/* Step 2: Processing Spinner */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-lime-400" />
            <h3 className="mt-4 font-display text-lg font-bold text-[#070910] dark:text-white">
              Authorizing Sandbox transaction...
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Confirming seats and generating your QR M-Ticket pass.
            </p>
          </div>
        )}

        {/* Step 3: Perforated Cinema Ticket Stub */}
        {step === 'success' && confirmedBooking && (
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 rounded-xl border border-lime-500/40 bg-lime-50 p-3.5 dark:border-lime-400/35 dark:bg-lime-400/10">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-lime-600 dark:text-lime-400" />
              <div>
                <h3 className="font-display text-base font-bold text-[#070910] dark:text-lime-200">
                  You’re all set! Enjoy the show.
                </h3>
                <p className="text-xs text-slate-700 dark:text-lime-300/90">
                  M-Ticket sent to {confirmedBooking.customerEmail}
                </p>
              </div>
            </div>

            {/* Perforated Ticket Stub Card */}
            <div className="relative mt-4 flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-[#F4F7FC] p-5 sm:flex-row dark:border-slate-800 dark:bg-[#070910]">
              {/* Ticket Stub Side Notches */}
              <div className="pointer-events-none hidden sm:block absolute left-[172px] -top-2.5 h-5 w-5 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0D111C]" />
              <div className="pointer-events-none hidden sm:block absolute left-[172px] -bottom-2.5 h-5 w-5 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0D111C]" />

              <div className="shrink-0 text-center sm:border-r sm:border-dashed sm:border-slate-300 sm:pr-5 dark:sm:border-slate-700">
                <QrCodeMatrix value={confirmedBooking.bookingId} size={128} />
                <p className="font-mono-tabular mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-[#070910] dark:text-slate-200">
                  <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-lime-400" />
                  {confirmedBooking.bookingId}
                </p>
              </div>

              <div className="w-full flex-1 space-y-2 text-sm">
                <h4 className="font-display text-lg font-bold text-[#070910] dark:text-white">
                  {confirmedBooking.movieTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {confirmedBooking.movieLanguage} · {confirmedBooking.format} · {confirmedBooking.movieCertification}
                </p>
                <div className="space-y-1.5 border-t border-dashed border-slate-300 pt-2.5 text-xs dark:border-slate-700">
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>Theatre:</strong> {confirmedBooking.theatreName}
                  </p>
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>Showtime:</strong> {confirmedBooking.dateLabel} at {confirmedBooking.showtime} ({confirmedBooking.screen})
                  </p>
                  <p className="font-mono-tabular text-[#070910] dark:text-lime-400">
                    <strong>Seats:</strong> {confirmedBooking.seats.join(', ')}
                  </p>
                  <p className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    <strong>Paid:</strong> ₹{confirmedBooking.totalAmount} · {confirmedBooking.paymentMethod}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
            >
              Done & Back to Movies
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
