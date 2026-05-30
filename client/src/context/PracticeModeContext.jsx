import { createContext, useContext, useState } from "react";

const PracticeModeContext = createContext();

export const PracticeModeProvider = ({ children }) => {
  const [isCompetitionMode, setIsCompetitionMode] = useState(false);

  const toggleMode = () => setIsCompetitionMode((prev) => !prev);

  return (
    <PracticeModeContext.Provider value={{ isCompetitionMode, toggleMode }}>
      {children}
    </PracticeModeContext.Provider>
  );
};

export const usePracticeMode = () => useContext(PracticeModeContext);