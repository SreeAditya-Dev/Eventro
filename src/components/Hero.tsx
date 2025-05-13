
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Hero = () => {
  return (
    <section className="relative">
      <div className="hero-gradient text-white py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">
              Find your next experience
            </h1>
            <p className="text-lg md:text-xl max-w-[600px] text-white/90">
              Discover events that match your passions, or create your own and connect with others.
            </p>
            
            <div className="w-full max-w-md mt-6">
              <form className="relative">
                <Input 
                  type="search" 
                  placeholder="Search events, venues, cities..." 
                  className="w-full pr-10 bg-white/95 border-0 text-black placeholder:text-gray-500 h-12"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1 top-1 h-10 w-10 bg-event-purple hover:bg-event-purple/90"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Button variant="outline" className="bg-white hover:bg-gray-100 text-event-dark">
                Music
              </Button>
              <Button variant="outline" className="bg-white hover:bg-gray-100 text-event-dark">
                Technology
              </Button>
              <Button variant="outline" className="bg-white hover:bg-gray-100 text-event-dark">
                Business
              </Button>
              <Button variant="outline" className="bg-white hover:bg-gray-100 text-event-dark">
                Food & Drink
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-20 mix-blend-overlay" />
    </section>
  );
};

export default Hero;
