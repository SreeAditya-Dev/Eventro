
import { useState, useEffect } from 'react';

// Custom hook to check if the current view is a mobile view
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Function to set the mobile state based on screen width
    function handleResize() {
      setIsMobile(window.innerWidth < 768); // Consider below 768px as mobile
    }

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

export default useIsMobile;
