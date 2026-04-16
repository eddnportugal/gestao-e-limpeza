import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

interface DemoContextData {
  isDemo: boolean;
  setDemo: (value: boolean) => void;
  tentarAcao: () => boolean;
  mostrarModal: boolean;
  fecharModal: () => void;
}

const DemoContext = createContext<DemoContextData>({
  isDemo: false,
  setDemo: () => {},
  tentarAcao: () => true,
  mostrarModal: false,
  fecharModal: () => {},
});

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemo] = useState(false);
  const [mostrarModal] = useState(false);

  const setDemo = useCallback((_value: boolean) => {}, []);

  const tentarAcao = useCallback(() => true, []);

  const fecharModal = useCallback(() => {}, []);

  const value = useMemo(() => ({ isDemo, setDemo, tentarAcao, mostrarModal, fecharModal }), [isDemo, setDemo, tentarAcao, mostrarModal, fecharModal]);

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
