'use client';

import { useEffect, useState } from 'react';
import {
  Users, ClipboardList, QrCode, Wallet, MessageSquare, BarChart3,
  ChevronDown, ShieldCheck
} from 'lucide-react';
import { DecorativeBackground } from './PublicPages';

interface LandingPageProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onTransparencyPortal: () => void;
}

const CHAIRPERSONS = [
  { file: 'BagumbayanNorte_Chairperson.jpg', barangay: 'Bagumbayan Norte', name: 'Florabelle P. Paligar' },
  { file: 'BagumbayanSur_Chairperson.jpg', barangay: 'Bagumbayan Sur', name: 'Patricia Mae P. Dimbuyayo' },
  { file: 'Balatas_Chairperson.jpg', barangay: 'Balatas', name: 'Joseph S. Ibuseo, Jr.' },
  { file: 'Calauag_Chairperson.jpg', barangay: 'Calauag', name: 'Patrick B. Bernas' },
  { file: 'ConcepcionGrande_Chairperson.jpg', barangay: 'Concepcion Grande', name: 'Marinel Mae M. Chua' },
  { file: 'ConcepcionPequena_Chairperson.jpg', barangay: 'Concepcion Pequeña', name: 'Micah DC. Imperial' },
  { file: 'Dayangdang_Chairperson.jpg', barangay: 'Dayangdang', name: 'James Joshua E. Manlangit' },
  { file: 'Dinaga_Chairperson.jpg', barangay: 'Dinaga', name: 'Josemarina Delacruz' },
  { file: 'Igualidad_Chairperson.jpg', barangay: 'Igualdad Interior', name: 'Jamaica B. Soñas' },
  { file: 'Liboton_Chairperson.jpg', barangay: 'Liboton', name: 'Don Vallen Colarina' },
  { file: 'Panicuason_Chairperson.jpg', barangay: 'Panicuason', name: 'John Mark Cosa' },
  { file: 'Penafrancia_Chairperson.jpg', barangay: 'Peñafrancia', name: 'Crystal Rose Ofemaria' },
  { file: 'SanFelipe_Chairperson.jpg', barangay: 'San Felipe', name: 'Nikka O. Nayera' },
  { file: 'SanFrancisco_Chairperson.jpg', barangay: 'San Francisco', name: 'Zaldy D. Bragais Jr.' },
  { file: 'Tabuco_Chairperson.jpg', barangay: 'Tabuco', name: 'Christobal Salvador Cambe' },
  { file: 'Tinago_Chairperson.jpg', barangay: 'Tinago', name: 'Kristin Ros Maleniza' },
  { file: 'Triangulo_Chairperson.jpg', barangay: 'Triangulo', name: 'Jyla Mir Dangea' },
];

const FEATURES = [
  { icon: Users, title: 'Youth Profiling & Digital ID', desc: 'Centralized Katipunan ng Kabataan registry with automated demographic classification, digital youth ID, and QR code generation.' },
  { icon: ClipboardList, title: 'Program & Event Management', desc: 'End-to-end lifecycle for SK programs — scheduling, calendar conflict detection, registration, and beneficiary tracking.' },
  { icon: QrCode, title: 'QR Code Attendance', desc: 'Scan-and-verify attendance via device camera with duplicate check-in prevention and real-time participation history.' },
  { icon: Wallet, title: 'Budget Transparency & COA Reports', desc: 'Automated VAT/Non-VAT computation, budget utilization tracking, and COA-ready financial statements per program.' },
  { icon: MessageSquare, title: 'Boses ng Kabataan', desc: 'Rule-based feedback classification into sentiment, concerns, and most-requested programs — with anonymous submission support.' },
  { icon: BarChart3, title: 'Federation Analytics', desc: 'Cross-barangay dashboards for the SK Federation President — youth population, program coverage, and budget utilization across Naga City.' },
];

const LOGO_SRC = '/images/Kabisig_logo.png';

export default function LandingPage({ onSignIn, onCreateAccount, onTransparencyPortal }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">
      {/* TOP NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="w-full px-6 lg:px-10 py-3 flex items-center justify-end">
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={onTransparencyPortal} className="hidden sm:inline-block px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">Transparency Portal</button>
            <button onClick={onSignIn} className="px-4 py-2 text-xs font-bold rounded-lg text-[#091d64] hover:bg-slate-100 transition-colors">Sign In</button>
            <button onClick={onCreateAccount} className="px-4 py-2 text-xs font-bold rounded-lg bg-[#091d64] hover:bg-[#122878] text-white transition-colors shadow-sm">Create Account</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white via-blue-50/40 to-white">
        <DecorativeBackground />
        <div className="relative z-10 w-full px-6 text-center pt-20 pb-16">
          <img src={LOGO_SRC} alt="KABISIG" className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto mb-6" />
          <p className="text-[#091d64] font-extrabold text-[11px] tracking-[0.4em] uppercase mb-3">Naga City - Sangguniang Kabataan</p>
          <h1 className="text-[#091d64] font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-none mb-5">KABISIG</h1>
          <p className="text-[#091d64] text-base sm:text-lg font-bold mb-3">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            A web-based multi-tenant information system for Sangguniang Kabataan councils in Naga City, empowering youth profiling, program management, financial transparency, and community engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onSignIn} className="px-8 py-4 bg-[#091d64] text-white font-extrabold rounded-xl hover:bg-[#122878] transition-all shadow-lg hover:shadow-xl text-sm uppercase tracking-wider">
              Sign In to Portal
            </button>
            <button onClick={onCreateAccount} className="px-8 py-4 bg-white border-2 border-[#091d64] text-[#091d64] font-extrabold rounded-xl hover:bg-[#091d64] hover:text-white transition-all text-sm uppercase tracking-wider">
              Create Account
            </button>
          </div>
          <button onClick={onTransparencyPortal} className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#091d64] transition-colors">
            View Public Transparency Portal
          </button>
          <div className="mt-12 text-slate-400 animate-bounce">
            <ChevronDown className="w-6 h-6 mx-auto" />
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="relative py-24 bg-white">
        <div className="w-full px-6 lg:px-10 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.3em] uppercase text-[#091d64] mb-3">About the Project</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#091d64] mb-5 leading-tight">Modernizing SK governance for the youth of Naga City</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Across the 27 barangays of Naga City, Sangguniang Kabataan councils rely on manual and semi-digital tools — spreadsheets, Messenger chats, and printed files — to manage youth profiling, program activities, budgets, and documents. This results in delayed reporting, incomplete records, and limited visibility for the community.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              <strong className="text-[#091d64]">KABISIG</strong> centralizes these operations into a single multi-tenant platform, aligning with the SK Reform Act (RA 10742), the DILG youth database mandate (MC 2022-033), and the SK Full Public Disclosure Policy (MC 2023-068), while preserving each barangay's data isolation and privacy.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#091d64]/5 to-amber-500/5 rounded-3xl blur-xl"></div>
            <img
              src="/images/All_Chairperson.jpg"
              alt="SK Chairpersons of Naga City"
              className="relative w-full h-auto rounded-2xl shadow-xl border border-slate-100"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-slate-50">
        <div className="w-full px-6 lg:px-10">
          <div className="text-center mb-14">
            <p className="text-[11px] font-extrabold tracking-[0.3em] uppercase text-[#091d64] mb-3">Core Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#091d64] mb-4">Built for how SK actually works</h2>
            <p className="text-slate-500 text-sm max-w-2xl mx-auto">Six integrated modules covering the complete SK workflow, from youth registration to federation-level analytics.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-xs transition-all duration-500 ease-out motion-reduce:transition-none hover:z-20 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.15]">
                  <div className="w-12 h-12 rounded-xl bg-[#091d64] text-amber-400 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LEGAL FOUNDATIONS */}
      <section aria-labelledby="legal-foundations-title" className="min-h-screen flex items-center py-16 bg-slate-50 border-y border-slate-200">
        <div className="w-full px-6 lg:px-10">
          <div className="text-center mb-12">
            <p className="text-[11px] font-extrabold tracking-[0.3em] uppercase text-[#091d64] mb-3">Statutory &amp; Legal Foundations</p>
            <h2 id="legal-foundations-title" className="text-3xl sm:text-4xl font-black text-[#091d64] mb-4">Built on the foundations of public service</h2>
            <p className="text-slate-500 text-sm max-w-2xl mx-auto">Explore the laws and policies guiding youth governance, transparency, and responsible data use.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { id: 'ra-10742', law: 'RA 10742', title: 'Sangguniang Kabataan Reform Act', detail: 'Supports the role of Sangguniang Kabataan in local youth governance.' },
              { id: 'dilg-2022-033', law: 'DILG MC 2022-033', title: 'Youth Profiling & Database Mandate', detail: 'Guides youth profiling and the maintenance of a youth database.' },
              { id: 'dilg-2023-068', law: 'DILG MC 2023-068', title: 'Full Public Disclosure Policy', detail: 'Guides public disclosure of SK plans, budgets, and reports.' },
              { id: 'ra-10173', law: 'RA 10173', title: 'National Data Privacy Act Compliance', detail: 'Sets requirements for responsible handling of personal information.' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-expanded={expandedLaw === item.id}
                aria-controls={`legal-detail-${item.id}`}
                onClick={() => setExpandedLaw(expandedLaw === item.id ? null : item.id)}
                className="group min-h-[240px] w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#091d64] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#091d64] text-amber-400 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <ChevronDown className={`mt-3 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${expandedLaw === item.id ? 'rotate-180' : ''}`} aria-hidden="true" />
                </div>
                <p className="mt-6 text-sm font-extrabold text-[#091d64]">{item.law}</p>
                <p className="mt-2 text-base font-bold leading-snug text-slate-900">{item.title}</p>
                <div id={`legal-detail-${item.id}`} hidden={expandedLaw !== item.id} className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600">
                  {item.detail}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-10 bg-white">
        <div className="w-full px-6 lg:px-10">
          <div className="text-center mb-7">
            <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#091d64] mb-2">The Team</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#091d64]">Built by two BS IT students at ADNU</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-md border-4 border-white ring-1 ring-slate-100 mb-3">
                <img
                  src="/images/Developer_pic1.jpg"
                  alt="David James B. Ignacio"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <p className="font-extrabold text-slate-900 text-base">David James B. Ignacio</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">BS Information Technology</p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-md border-4 border-white ring-1 ring-slate-100 mb-3">
                <img
                  src="/images/Developer_pic3.jpg"
                  alt="Ashley Kyla D. Vinzon"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <p className="font-extrabold text-slate-900 text-base">Ashley Kyla D. Vinzon</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">BS Information Technology</p>
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-500 font-semibold mt-6">
            Ateneo de Naga University - College of Computer Studies - Department of Computer Science
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#061344] text-blue-200/70 py-10">
        <div className="w-full px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1">
              <img src={LOGO_SRC} alt="KABISIG" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight">KABISIG</span>
          </div>
          <div className="text-center sm:text-right text-[11px] leading-relaxed font-medium">
            <p className="text-blue-100 font-semibold">A Senior Thesis Project - Bachelor of Science in Information Technology</p>
            <p>Department of Computer Science - College of Computer Studies</p>
            <p>Ateneo de Naga University - Naga City, Philippines - 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}