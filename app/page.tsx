import MouseGlow from "@/components/MouseGlow";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Experience from "@/components/Experience";
import Beliefs from "@/components/Beliefs";
import Thoughts from "@/components/Thoughts";
import SystemCard from "@/components/SystemCard";
import Timeline from "@/components/Timeline";
import ChinaMap from "@/components/ChinaMap";
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
      <div id="beliefs">
        <Beliefs />
      </div>
      <Thoughts />
      <SystemCard />
      <Timeline />
      <ChinaMap />
      <RecentThinking />
      <Guestbook />
      <Footer />
    </main>
  );
}
