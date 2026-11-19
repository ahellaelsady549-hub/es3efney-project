
import { lazy, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ServiceShortcuts } from '@/components/ServiceShortcuts';

import { EmergencyNumbers } from '@/components/EmergencyNumbers';
import { DeferredHomeSection } from '@/components/DeferredHomeSection';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const FirstAid = lazy(() => import('@/components/FirstAid').then(module => ({ default: module.FirstAid })));
const Treatments = lazy(() => import('@/components/Treatments').then(module => ({ default: module.Treatments })));
const MentalHealth = lazy(() => import('@/components/MentalHealth').then(module => ({ default: module.MentalHealth })));
const DailyTip = lazy(() => import('@/components/DailyTip').then(module => ({ default: module.DailyTip })));
const DietPlan = lazy(() => import('@/components/DietPlan').then(module => ({ default: module.DietPlan })));
const PersonalityTest = lazy(() => import('@/components/PersonalityTest').then(module => ({ default: module.PersonalityTest })));
const LocationSearch = lazy(() => import('@/components/LocationSearch').then(module => ({ default: module.LocationSearch })));
const Physiotherapy = lazy(() => import('@/components/Physiotherapy').then(module => ({ default: module.Physiotherapy })));

const Index = () => {
  const { user } = useAuth();
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root, Boolean(user));

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      target.setAttribute('data-scroll-reveal', 'visible');
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [location.hash, location.key, user]);

  return (
    <div ref={root} className="home-content min-h-screen bg-background">
      <Header />
      <Hero />
      <ServiceShortcuts />
      <EmergencyNumbers />
      <DeferredHomeSection id="first-aid" section={FirstAid} minHeight={850} />
      <DeferredHomeSection id="treatments" section={Treatments} minHeight={950} />
      <DeferredHomeSection id="mental-health" section={MentalHealth} minHeight={900} />
      <DeferredHomeSection id="daily-tip" section={DailyTip} minHeight={420} />
      {user && <DeferredHomeSection id="diet-plan" section={DietPlan} minHeight={780} />}
      {user && <DeferredHomeSection id="personality-test" section={PersonalityTest} minHeight={850} />}
      <DeferredHomeSection id="physiotherapy" section={Physiotherapy} minHeight={650} />
      <DeferredHomeSection id="location" section={LocationSearch} minHeight={700} />
      <Footer />
    </div>
  );
};

export default Index;
