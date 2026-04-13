import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PreferredNook from "@/components/PreferredNook";
import BorrowedTreasures from "@/components/BorrowedTreasures";
import DailyQuote from "@/components/DailyQuote";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <PreferredNook />
      <BorrowedTreasures />
      <DailyQuote />
      <Footer />
    </>
  );
}
