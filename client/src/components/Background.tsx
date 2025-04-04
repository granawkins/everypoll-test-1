const Background = () => {
  const splashStyles = {
    position: 'absolute' as const,
    borderRadius: '50%',
    filter: 'blur(80px)',
  };

  const lightBlue = 'rgba(64,223,255,1)';
  const darkBlue = 'rgba(0,21,199,0.6)';
  const lightPink = 'rgba(255,0,228,0.8)';
  const darkPink = 'rgba(154,0,255,0.4)';
  const lightGreen = 'rgba(0,255,117,0.8)';
  const darkGreen = 'rgba(0,95,138,0.6)';
  const lightYellow = 'rgba(255,222,89,0.8)';
  const darkYellow = 'rgba(255,87,51,0.5)';
  const lightPurple = 'rgba(139,0,255,0.7)';
  const darkPurple = 'rgba(0,59,255,0.4)';

  const gradient = (light: string, dark: string) =>
    `radial-gradient(circle, ${light} 0%, ${dark} 100%)`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden',
        opacity: 0.5,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          ...splashStyles,
          width: '450px',
          height: '450px',
          background: gradient(lightBlue, darkBlue),
          top: '10%',
          left: '20%',
        }}
      />
      <div
        style={{
          ...splashStyles,
          width: '350px',
          height: '350px',
          background: gradient(lightPink, darkPink),
          top: '40%',
          right: '15%',
        }}
      />
      <div
        style={{
          ...splashStyles,
          width: '400px',
          height: '400px',
          background: gradient(lightGreen, darkGreen),
          bottom: '5%',
          left: '30%',
        }}
      />
      <div
        style={{
          ...splashStyles,
          width: '300px',
          height: '300px',
          background: gradient(lightYellow, darkYellow),
          top: '20%',
          right: '25%',
        }}
      />
      <div
        style={{
          ...splashStyles,
          width: '380px',
          height: '380px',
          background: gradient(lightPurple, darkPurple),
          bottom: '15%',
          left: '10%',
        }}
      />
    </div>
  );
};

export default Background;
