import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProblemSolution from "@/components/ProblemSolution";
import Features from "@/components/Features";
import Statistics from "@/components/Statistics";
import HowItWorks from "@/components/HowItWorks";
import UseCases from "@/components/UseCases";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import TrustBadges from "@/components/TrustBadges";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <ProblemSolution />
      <Features />
      <Statistics />
      <HowItWorks />
      <UseCases />
      <Testimonials />
      <Pricing />
      <FAQ />
      <TrustBadges />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
