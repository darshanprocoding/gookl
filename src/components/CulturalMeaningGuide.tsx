import React from 'react';
import { X, ShieldCheck, Heart, Sparkles, BookOpen, Clock, Compass, Activity, Globe, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AshokaChakra, TirangaRibbon } from './AshokaChakra';
import { useTranslation } from '../context/LanguageContext';

interface CulturalMeaningGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CulturalMeaningGuide: React.FC<CulturalMeaningGuideProps> = ({ isOpen, onClose }) => {
  const { t, currentLanguage } = useTranslation();

  if (!isOpen) return null;

  const colorMeanings = [
    {
      name: currentLanguage === 'hi' ? 'केसरिया (India Saffron)' : 'Kesari (India Saffron)',
      hex: '#FF9933',
      bgClass: 'bg-[#FF9933]',
      textClass: 'text-[#FF9933]',
      borderClass: 'border-[#FF9933]/40',
      title: currentLanguage === 'hi' ? 'शौर्य, त्याग एवं त्वरित आपदा प्रतिक्रिया' : 'Courage, Valor & Rapid Crisis Action',
      description:
        'In the Indian national philosophy, Saffron signifies strength, courage, selflessness, and readiness to act in adversity. In this application, Kesari is applied to active disaster epicenters, hazard threshold alerts, primary command triggers, and critical evacuation corridors where urgency and valor are paramount.',
      appliedIn: ['Disaster Epicenter Markers', 'High Severity Alerts', 'Primary Command Triggers', 'Active Emergency Indicators'],
    },
    {
      name: currentLanguage === 'hi' ? 'श्वेत (Peace Alabaster)' : 'Shwet (Peace Alabaster)',
      hex: '#FFFFFF',
      bgClass: 'bg-white',
      textClass: 'text-white',
      borderClass: 'border-white/30',
      title: currentLanguage === 'hi' ? 'सत्य, स्पष्टता एवं पारदर्शी डेटा' : 'Satya, Clarity & Unbiased Data Transparency',
      description:
        'The white central band of the Tiranga symbolizes peace, truth (Satya), and purity of motive. In disaster intelligence, this represents unadulterated ground telemetry, transparent vulnerability scoring, and clear legible communication to maintain public order and calm amidst catastrophe.',
      appliedIn: ['High-Legibility Metric Readouts', 'Telemetry Data Tables', 'Card Headers', 'Clean Analytical Typography'],
    },
    {
      name: currentLanguage === 'hi' ? 'भारत हरा (India Green)' : 'Hara (India Green)',
      hex: '#138808',
      bgClass: 'bg-[#138808]',
      textClass: 'text-emerald-400',
      borderClass: 'border-[#138808]/40',
      title: currentLanguage === 'hi' ? 'समृद्धि, प्रकृति एवं जीवन रक्षा' : 'Life, Fertility, Earth & Restoration',
      description:
        'The green band represents prosperity, connection to the soil (Bhumi), ecological rejuvenation, and life safety. In our system, India Green denotes nominal operational status, restored lifeline infrastructure, green logistics corridors, and safe evacuation shelters.',
      appliedIn: ['Nominal Health Indicators', 'Green Road Relief Corridors', 'Restored Lifeline Grids', 'Safe Haven Zones'],
    },
    {
      name: currentLanguage === 'hi' ? 'अशोक चक्र गहरा नीला (Ashoka Chakra Navy)' : 'Ashoka Chakra Navy (Dharmachakra)',
      hex: '#000080 & #0A1329',
      bgClass: 'bg-[#000080]',
      textClass: 'text-blue-400',
      borderClass: 'border-blue-500/40',
      title: currentLanguage === 'hi' ? '२४x७ सतत निगरानी एवं कर्तव्य' : '24-Hour Continuous Vigilance & Righteous Duty',
      description:
        'The 24 spokes of the Dharmachakra from the Lion Capital of Ashoka symbolize the 24 hours of the day, eternal motion (Charaiveti), and universal justice. The deep midnight navy serves as our foundational canvas, reflecting relentless 24/7 disaster monitoring, institutional integrity, and civil protection.',
      appliedIn: ['Midnight Canvas (#060B18, #0A1329)', '24-Spoke Live Status Wheel', 'National Command Crests', 'Navigation Anchors'],
    },
    {
      name: currentLanguage === 'hi' ? 'स्वर्ण एवं ताम्र (Vedic Gold & Brass)' : 'Swarna / Tamra (Vedic Gold & Brass)',
      hex: '#D97706',
      bgClass: 'bg-[#D97706]',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/40',
      title: currentLanguage === 'hi' ? 'ज्ञान, परंपरा एवं निस्वार्थ सेवा' : 'Wisdom, Heritage & Noble Service',
      description:
        'Inspired by traditional Indian brass lamps (Deepam) and civil honors, golden copper accents symbolize the light of wisdom dispelling the darkness of crisis and honoring the frontline responders who embody selfless service (Seva).',
      appliedIn: ['Simulation Scenario Highlights', 'Command Badges', 'Key Statistical Cards', 'Mutual Aid Accents'],
    },
  ];

  const culturalPrinciples = [
    {
      sanskrit: 'आपद् उद्धरणम् धर्मः',
      transliteration: 'Aapad Uddharanam Dharmah',
      meaning: currentLanguage === 'hi' ? 'आपदा के समय राहत व बचाव ही सर्वोच्च नागरिक कर्तव्य है।' : 'Relief and rescue in times of calamity is our highest civic duty.',
      context: 'The guiding mandate for automated resource dispatch, mutual aid routing, and vulnerability minimization.',
    },
    {
      sanskrit: 'वसुधैव कुटुम्बकम्',
      transliteration: 'Vasudhaiva Kutumbakam',
      meaning: currentLanguage === 'hi' ? 'सम्पूर्ण विश्व एक परिवार है।' : 'The entire world is one interconnected family.',
      context: 'Powering the interstate resource-sharing protocol where surplus states dispatch water pumps, boats, and ration kits to impacted neighboring states.',
    },
    {
      sanskrit: 'अहर्निशं सेवामहे',
      transliteration: 'Aharnisham Sevamahe',
      meaning: currentLanguage === 'hi' ? 'दिन-रात हम निस्वार्थ सेवा करते हैं।' : 'Day and night, we serve selflessly.',
      context: 'Represented by the 24-spoke Ashoka Chakra live telemetry engine running uninterrupted real-time risk modeling.',
    },
    {
      sanskrit: 'पंचतत्व एवं आधारभूत अवसंरचना',
      transliteration: 'Panchatatva & Critical Infrastructure',
      meaning: currentLanguage === 'hi' ? 'मूलभूत जीवन रेखाओं का संतुलन (जल, वायु, ऊर्जा, संचार, परिवहन)।' : 'Harmonizing the elemental lifelines (Water, Wind, Power, Telecom, Transport).',
      context: 'Reflected in the 4 core infrastructure telemetry matrices: Transport Network, Drainage Systems, Telecom Grid, and Power Grid.',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="bg-[#0A1329] border border-[#1E325C] rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 relative flex flex-col max-h-[90vh]"
        >
          {/* Top Tiranga Micro-Ribbon */}
          <TirangaRibbon height="h-1.5" />

          {/* Modal Header */}
          <div className="p-6 border-b border-[#1A2D52] bg-[#070D1D] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 flex items-center justify-center text-[#FF9933] shadow-[0_0_20px_rgba(255,153,51,0.2)] shrink-0">
                <AshokaChakra size={28} color="#FF9933" animate />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-slate-100 tracking-tight">
                    {currentLanguage === 'hi' ? 'भारतीय अभिकल्प दर्शन एवं तिरंगा रंग प्रणाली' : 'Tiranga Design Ethos & Cultural Philosophy'}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30">
                    {t('app.designEthos', 'Design Ethos')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Symbolic meanings, cultural heritage principles, and color philosophy embedded across the Urban Vuln Engine.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0F1E3D] hover:bg-[#1A2D52] text-slate-400 hover:text-white border border-[#1E325C] transition-all cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E325C]">
            {/* 1. The Tiranga Tri-Color Palette & Dharmachakra Foundation */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#FF9933]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  {currentLanguage === 'hi' ? '१. राष्ट्रध्वज के रंग एवं परिचालन में उनका महत्व' : '1. Colors of the National Flag & Operational Significance'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {colorMeanings.map((c) => (
                  <div
                    key={c.name}
                    className="bg-[#070D1D] border border-[#16274A] rounded-xl p-4.5 hover:border-[#223E75] transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-4 h-4 rounded-full ${c.bgClass} shadow-md shrink-0 border border-white/20`} />
                          <span className="font-bold text-xs text-slate-100">{c.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 bg-[#0F1E3D] px-2 py-0.5 rounded border border-[#1E325C]">
                          {c.hex}
                        </span>
                      </div>

                      <h4 className={`text-xs font-bold ${c.textClass} mb-1.5`}>
                        {c.title}
                      </h4>

                      <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                        {c.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#142342]">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        UI Implementation:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.appliedIn.map((app) => (
                          <span
                            key={app}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[#0F1E3D] border border-[#1E325C] text-slate-300 font-medium"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Guiding Vedic & Civil Defense Principles */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-[#138808]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  {currentLanguage === 'hi' ? '२. मार्गदर्शक नागरिक रक्षा सिद्धांत' : '2. Guiding Civil Defense Maxims & Values'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {culturalPrinciples.map((cp) => (
                  <div
                    key={cp.sanskrit}
                    className="bg-[#070D1D] border border-[#16274A] rounded-xl p-4 relative"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-sm font-black text-[#FF9933] font-serif">
                        {cp.sanskrit}
                      </span>
                      <span className="text-[10px] text-slate-400 italic">
                        {cp.transliteration}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 mt-1">
                      "{cp.meaning}"
                    </p>

                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed border-t border-[#142342] pt-2">
                      <strong className="text-slate-300">System Context:</strong> {cp.context}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. The 24-Spoke Ashoka Chakra (Dharmachakra) Explained */}
            <div className="bg-[#070D1D] border border-[#16274A] rounded-xl p-5 flex flex-col md:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#000080]/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                <AshokaChakra size={56} color="#60A5FA" animate />
              </div>
              <div className="space-y-1.5 text-center md:text-left">
                <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                  <span>The 24-Spoke Ashoka Chakra & Continuous Vigilance</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    24x7 Ready
                  </span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Adopted from the Lion Capital of Ashoka at Sarnath, the 24 spokes represent the 24 hours of the day and cardinal virtues. In disaster response, it stands for our promise of <strong>uninterrupted 24/7 real-time situational awareness</strong>, where early warning and resource logistics never sleep.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-[#1A2D52] bg-[#070D1D] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-[#138808]" />
              <span>National Disaster Resilience Engine</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF9933] hover:bg-[#FF9933]/90 text-slate-950 transition-all shadow-md shadow-[#FF9933]/20 cursor-pointer"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
