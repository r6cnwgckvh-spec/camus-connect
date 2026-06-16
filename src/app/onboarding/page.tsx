'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const COURSES = ['B.Tech', 'B.E.', 'BCA', 'MCA', 'MBA', 'BBA', 'B.Sc', 'M.Tech', 'M.Sc', 'B.Com', 'M.Com', 'BA', 'MA', 'Diploma', 'PhD', 'Other'];
const BRANCHES = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT', 'AI & ML', 'Data Science', 'Full Stack Development', 'Civil', 'Chemical', 'Biotech', 'Aerospace', 'Automobile', 'Other'];
const YEARS = [
  { value: 'FirstYear', label: '1st Year' },
  { value: 'SecondYear', label: '2nd Year' },
  { value: 'ThirdYear', label: '3rd Year' },
  { value: 'FourthYear', label: '4th Year' },
  { value: 'FifthYear', label: '5th Year' },
  { value: 'FinalYear', label: 'Final Year' },
  { value: 'Graduated', label: 'Graduated/Alumni' },
];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const LOOKING_FOR = [
  { value: 'Roommate', label: 'Roommate' },
  { value: 'PG_Hostel', label: 'PG/Hostel Info' },
  { value: 'StudyGroup', label: 'Study Group' },
  { value: 'Networking', label: 'Just Networking' },
];

const COMPATIBILITY_QUESTIONS = [
  { key: 'sleepSchedule', question: 'Sleep schedule?', options: ['Early bird (sleep by 10pm)', 'Night owl (sleep after midnight)', 'Flexible'] },
  { key: 'cleanliness', question: 'Cleanliness habits?', options: ['Very tidy', 'Average', 'Relaxed/Chill'] },
  { key: 'foodPreference', question: 'Food preference?', options: ['Veg', 'Non-veg', 'Either'] },
  { key: 'smoking', question: 'Smoking?', options: ['Non-smoker', 'Smoker'] },
  { key: 'socialStyle', question: 'Social style?', options: ['Outgoing', 'Quiet/Introvert', 'Mix of both'] },
  { key: 'studyHabits', question: 'Study habits?', options: ['Study at home', 'Study at library', 'Flexible'] },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    username: '',
    collegeName: '',
    collegeId: '',
    collegeCity: '',
    collegeState: '',
    course: '',
    branch: '',
    yearOfStudy: '',
    lookingFor: [] as string[],
    bio: '',
    profilePhotoUrl: '',
  });

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameDebounce, setUsernameDebounce] = useState<ReturnType<typeof setTimeout>|null>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeResults, setCollegeResults] = useState<any[]>([]);
  const [collegeSearching, setCollegeSearching] = useState(false);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [customCollege, setCustomCollege] = useState(false);

  const [compatAnswers, setCompatAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
    if (status === 'authenticated' && (session?.user as any)?.onboardingCompleted) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user) {
      setForm(f => ({ ...f, fullName: session.user.name || '', email: session.user.email || '', profilePhotoUrl: session.user.image || '' }));
    }
  }, [session]);

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  useEffect(() => {
    const u = form.username.trim().toLowerCase();
    if (u.length < 3) { setUsernameAvailable(null); return; }
    if (!/^[a-z0-9_]+$/.test(u)) { setUsernameAvailable(false); return; }
    if (usernameDebounce) clearTimeout(usernameDebounce);
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/username?q=${encodeURIComponent(u)}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch { setUsernameAvailable(null); }
      finally { setUsernameChecking(false); }
    }, 400);
    setUsernameDebounce(timer);
    return () => clearTimeout(timer);
  }, [form.username]);

  useEffect(() => {
    if (collegeSearch.length < 2 || customCollege) {
      setCollegeResults([]);
      setShowCollegeDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCollegeSearching(true);
      try {
        const res = await fetch(`/api/colleges?q=${encodeURIComponent(collegeSearch)}&limit=10`);
        const data = await res.json();
        setCollegeResults(data.colleges || []);
        setShowCollegeDropdown(true);
      } catch {} finally {
        setCollegeSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [collegeSearch, customCollege]);

  const sendOtp = async () => {
    if (!form.email) { toast.error('Email is required'); return; }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/onboarding/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      setOtpCooldown(60);
      toast.success('OTP sent! Check your email (including spam folder).');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await fetch('/api/onboarding/otp', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpVerified(true);
      toast.success('Email verified!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const selectCollege = (college: any) => {
    setForm(f => ({ ...f, collegeName: college.name, collegeId: college.id, collegeCity: college.city, collegeState: college.state }));
    setCollegeSearch(college.name);
    setShowCollegeDropdown(false);
    setCustomCollege(false);
  };

  const handleSubmit = async () => {
    const requiredStep1 = form.fullName && form.email && otpVerified && form.gender && form.dob;
    const requiredStep2 = form.collegeName && form.course && form.branch && form.yearOfStudy;
    const requiredStep3 = form.lookingFor.length > 0;

    if (!requiredStep1 || !requiredStep2 || !requiredStep3) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          username: form.username,
          gender: form.gender,
          dob: form.dob,
          collegeId: form.collegeId || undefined,
          collegeName: !form.collegeId ? form.collegeName : undefined,
          collegeCity: !form.collegeId ? form.collegeCity : undefined,
          collegeState: !form.collegeId ? form.collegeState : undefined,
          course: form.course,
          branch: form.branch,
          yearOfStudy: form.yearOfStudy,
          lookingFor: form.lookingFor,
          bio: form.bio,
          profilePhotoUrl: form.profilePhotoUrl,
          compatibilityAnswers: form.lookingFor.includes('Roommate') ? compatAnswers : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Welcome to CampusConnect, ${form.fullName.split(' ')[0]}!`);
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const steps = ['Basic Info', 'College Info', 'Preferences', 'Photo & Bio'];
  const progress = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex-1">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">Complete Your Profile</span>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {steps.map((s, i) => (
              <div key={s} className={`flex items-center gap-1 ${i > 0 ? 'ml-1' : ''}`}>
                <div className={`w-2 h-2 rounded-full ${i + 1 <= step ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className={`text-xs ${i + 1 === step ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Basic Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">@</span>
                    <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }))} placeholder="username" className="w-full pl-8 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {form.username.length >= 3 && (
                        usernameChecking ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          : usernameAvailable === true ? <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          : usernameAvailable === false ? <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                          : null
                      )}
                    </span>
                  </div>
                  {form.username.length > 0 && form.username.length < 3 && <p className="text-xs text-red-500 mt-1">Username must be at least 3 characters</p>}
                  {form.username.length >= 3 && !/^[a-z0-9_]+$/.test(form.username) && <p className="text-xs text-red-500 mt-1">Only lowercase letters, numbers, and underscores allowed</p>}
                  {form.username.length >= 3 && usernameAvailable === false && <p className="text-xs text-red-500 mt-1">Username is already taken</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input type="email" value={form.email} disabled className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Verification *</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="email" value={form.email} disabled className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed text-sm" />
                    {!otpVerified && (
                      <button onClick={sendOtp} disabled={otpLoading || otpCooldown > 0} className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm font-medium transition-colors">
                        {otpLoading ? 'Sending...' : otpCooldown > 0 ? `${otpCooldown}s` : 'Send OTP'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">A verification code will be sent to your Google email</p>
                  {otpSent && !otpVerified && (
                    <div className="flex gap-2">
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} placeholder="Enter 6-digit OTP" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center text-lg tracking-widest" />
                      <button onClick={verifyOtp} disabled={otpLoading || otp.length !== 6} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap text-sm font-medium transition-colors">
                        {otpLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  )}
                  {otpVerified && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Email verified</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender *</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                  <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(2)} disabled={!form.fullName || !otpVerified || !form.gender || !form.dob || !form.username || usernameAvailable !== true} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">College & Academic Info</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College Name *</label>
                <div className="relative">
                  <input type="text" value={collegeSearch} onChange={e => { setCollegeSearch(e.target.value); setCustomCollege(false); }} placeholder="Search for your college..." className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  {collegeSearching && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}
                  {showCollegeDropdown && collegeResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {collegeResults.map((c) => (
                        <button key={c.id} type="button" onClick={() => selectCollege(c)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-gray-600 border-b border-gray-50 dark:border-gray-600 last:border-0 transition-colors">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-xs text-gray-500">
                            {[c.city, c.state].filter(Boolean).join(', ')}{c.type ? ` • ${c.type}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {collegeSearching && collegeResults.length === 0 && collegeSearch.length >= 2 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading colleges...</p>
                      </div>
                    </div>
                  )}
                  {showCollegeDropdown && collegeSearch.length >= 2 && collegeResults.length === 0 && !collegeSearching && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Can't find your college?</p>
                      <button onClick={() => { setCustomCollege(true); setShowCollegeDropdown(false); setForm(f => ({ ...f, collegeName: collegeSearch })); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        Add my college manually
                      </button>
                    </div>
                  )}
                </div>
                {customCollege && (
                  <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3 font-medium">Enter your college details (admin will verify)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3">
                        <input type="text" value={form.collegeName} onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))} placeholder="College name" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <input type="text" value={form.collegeCity} onChange={e => setForm(f => ({ ...f, collegeCity: e.target.value }))} placeholder="City" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input type="text" value={form.collegeState} onChange={e => setForm(f => ({ ...f, collegeState: e.target.value }))} placeholder="State" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      <select value="Other" onChange={e => setForm(f => ({ ...f, collegeType: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Other">Type</option><option value="Government">Government</option><option value="Private">Private</option><option value="Deemed">Deemed</option>
                      </select>
                    </div>
                  </div>
                )}
                {(form.collegeName && !customCollege) && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {form.collegeName}
                    {[form.collegeCity, form.collegeState].filter(Boolean).length > 0 && ` — ${[form.collegeCity, form.collegeState].filter(Boolean).join(', ')}`}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course *</label>
                  <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select course</option>
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch/Specialization *</label>
                  <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select branch</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year of Study *</label>
                  <div className="flex flex-wrap gap-2">
                    {YEARS.map(y => (
                      <button key={y.value} onClick={() => setForm(f => ({ ...f, yearOfStudy: y.value }))} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.yearOfStudy === y.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-300'}`}>{y.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 font-medium">Back</button>
                <button onClick={() => setStep(3)} disabled={!form.collegeName || !form.course || !form.branch || !form.yearOfStudy} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What are you looking for? *</label>
                <div className="grid grid-cols-2 gap-3">
                  {LOOKING_FOR.map(lf => (
                    <button key={lf.value} onClick={() => setForm(f => ({ ...f, lookingFor: f.lookingFor.includes(lf.value) ? f.lookingFor.filter(x => x !== lf.value) : [...f.lookingFor, lf.value] }))} className={`p-3 rounded-lg border text-sm font-medium text-left transition-colors ${form.lookingFor.includes(lf.value) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-300'}`}>
                      {lf.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.lookingFor.includes('Roommate') && (
                <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Roommate Compatibility Quiz (Optional)</h3>
                  <p className="text-sm text-gray-500 mb-4">Answer a few quick questions to find better roommate matches</p>
                  <div className="space-y-4">
                    {COMPATIBILITY_QUESTIONS.map((q) => (
                      <div key={q.key}>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{q.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => (
                            <button key={opt} onClick={() => setCompatAnswers(a => ({ ...a, [q.key]: opt }))} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${compatAnswers[q.key] === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300'}`}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 font-medium">Back</button>
                <button onClick={() => setStep(4)} disabled={form.lookingFor.length === 0} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Photo & Bio</h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                  {form.profilePhotoUrl ? (
                    <img src={form.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-indigo-600 dark:text-indigo-300 font-bold">
                      {form.fullName?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Profile Photo</p>
                  <p className="text-xs text-gray-500 mt-0.5">Auto-filled from your Google account. You can change it later in settings.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea value={form.bio} onChange={e => e.target.value.length <= 300 && setForm(f => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Tell other students a bit about yourself... (optional)" className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                <p className="text-xs text-gray-400 text-right mt-1">{form.bio.length}/300</p>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 font-medium">Back</button>
                <button onClick={handleSubmit} disabled={submitting} className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2">
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : (
                    'Complete Profile'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
