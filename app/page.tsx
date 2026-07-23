import MouseGlow from "@/components/MouseGlow";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Experience from "@/components/Experience";
import Creations from "@/components/Creations";
import Beliefs from "@/components/Beliefs";
import Thoughts from "@/components/Thoughts";
import InkParticleMorph from "@/components/InkParticleMorph";
import SystemCard from "@/components/SystemCard";
import Timeline from "@/components/Timeline";
import FootprintJournal from "@/components/FootprintJournal";
import RecentThinking from "@/components/RecentThinking";
import Guestbook from "@/components/Guestbook";
import Footer from "@/components/Footer";
import FloatingArrow from "@/components/FloatingArrow";
import AvatarChat from "@/components/AvatarChat";

export default function Home() {
  return (
    <main>
      <MouseGlow />
      <FloatingArrow />
      <AvatarChat />
      <Nav />
      <Hero />
      <Experience />
      <Creations />
      <div id="beliefs">
        <Beliefs />
      </div>
      <Thoughts />
      <InkParticleMorph />
      <SystemCard />
      <Timeline />
      <FootprintJournal />
      <RecentThinking />
      <Guestbook />
      <Footer />
    </main>
  );
}
