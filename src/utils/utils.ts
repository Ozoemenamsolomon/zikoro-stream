export function calculateAndSetWindowHeight(
    divRef: React.RefObject<HTMLDivElement>, ded: number = 100
  ) {
    const div = divRef.current;
  
    if (div) {
      
  
      
      div.style.height = `${window.innerHeight -ded}px`;
    }
  }
    