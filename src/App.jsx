import React, { useRef, useLayoutEffect, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Html, Float, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CARS = [
  { id: 'db11', name: 'Aston Martin DB11', modelPath: '/models/car.glb', scale: 85 },
  { id: 'vantage', name: 'Aston Martin Vantage', modelPath: '/models/car2.glb', scale: 0.85 },
];

const COLORS = [
  { name: 'Onyx Black', hex: '#111111' },
  { name: 'British Racing Green', hex: '#0f382c' },
  { name: 'Crimson Red', hex: '#8a0a1a' },
  { name: 'Sunburst Gold', hex: '#b38128' },
];

const RIM_COLORS = [
  { name: 'Silver Steel', hex: '#c0c0c0' },
  { name: 'Gloss Black', hex: '#151515' },
  { name: 'Race Gold', hex: '#d4af37' },
];

const CALIPER_COLORS = [
  { name: 'Crimson Red', hex: '#ff0000' },
  { name: 'Acid Yellow', hex: '#ccff00' },
  { name: 'Onyx Black', hex: '#111111' },
];

const ENV_MODES = [
  { id: 'studio', name: 'Studio', preset: 'studio', lightColor: '#ffffff' },
  { id: 'night', name: 'Cyber Night', preset: 'city', lightColor: '#ff0055' },
  { id: 'sunset', name: 'Sunset', preset: 'sunset', lightColor: '#ff8844' },
  { id: 'daylight', name: 'Daylight', preset: 'park', lightColor: '#ffffff' },
];

// Функция генерации реалистичного басовитого звука V8 рева через Web Audio API
function playEngineSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.log('Audio playback prevented');
  }
}

function Loader() {
  return (
    <Html center>
      <div style={{
        color: '#fff', background: 'rgba(0,0,0,0.85)', padding: '14px 28px',
        borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)',
        fontSize: '14px', whiteSpace: 'nowrap'
      }}>
        ⏳ Loading 3D Scene...
      </div>
    </Html>
  );
}

function Podium() {
  return (
    <group position={[0, -0.85, 0]}>
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <cylinderGeometry args={[3.2, 3.4, 0.1, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.01, 0]}>
        <ringGeometry args={[3.15, 3.2, 64]} />
        <meshBasicMaterial color="#ff416c" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CarModel({ modelPath, scale, currentColor, currentRimColor, currentCaliperColor, lightsOn, modelRef, isEngineRunning }) {
  const { scene } = useGLTF(modelPath);

  useFrame(() => {
    if (isEngineRunning && modelRef.current) {
      modelRef.current.position.x = (Math.random() - 0.5) * 0.006;
      modelRef.current.position.z = (Math.random() - 0.5) * 0.006;
    } else if (modelRef.current) {
      modelRef.current.position.x = 0;
      modelRef.current.position.z = 0;
    }
  });

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const matName = child.material.name.toLowerCase();
        const meshName = child.name.toLowerCase();

        if (matName.includes('body') || matName.includes('paint') || matName.includes('car') || child.material.color) {
          if (!matName.includes('wheel') && !matName.includes('rim') && !matName.includes('brake') && !matName.includes('caliper')) {
            child.material.color = new THREE.Color(currentColor);
            child.material.roughness = 0.15;
            child.material.metalness = 0.85;
          }
        }

        if (matName.includes('rim') || matName.includes('wheel') || meshName.includes('rim')) {
          child.material.color = new THREE.Color(currentRimColor);
          child.material.metalness = 0.9;
          child.material.roughness = 0.2;
        }

        if (matName.includes('caliper') || matName.includes('brake') || meshName.includes('caliper')) {
          child.material.color = new THREE.Color(currentCaliperColor);
        }
      }
    });
  }, [scene, currentColor, currentRimColor, currentCaliperColor]);

  return (
    <group ref={modelRef} position={[0, -0.8, 0]}>
      <primitive object={scene} scale={scale} />
      {lightsOn && (
        <>
          <spotLight position={[0.6, 0.5, 2]} target-position={[0.6, -0.2, 6]} angle={0.5} penumbra={0.5} intensity={30} color="#ffffff" />
          <spotLight position={[-0.6, 0.5, 2]} target-position={[-0.6, -0.2, 6]} angle={0.5} penumbra={0.5} intensity={30} color="#ffffff" />
        </>
      )}
    </group>
  );
}

function EngineModel({ engineRef }) {
  const { scene } = useGLTF('/models/engine.glb');
  return (
    <group ref={engineRef} position={[0, -100, 0]}>
      <primitive object={scene} scale={0.20} />
    </group>
  );
}

function ScrollAnimator({ modelRef, engineRef, setScrollProgress }) {
  useLayoutEffect(() => {
    if (!modelRef.current || !engineRef.current) return;

    gsap.set(modelRef.current.position, { y: -0.8 });
    gsap.set(engineRef.current.position, { y: -100 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scroll-container',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: (self) => setScrollProgress(Math.round(self.progress * 100)),
        },
      });

      tl.to(modelRef.current.rotation, { y: Math.PI * 0.8, duration: 1 })
        .to(modelRef.current.rotation, { y: Math.PI * 1.5, duration: 1 })
        
        .to(modelRef.current.position, { y: -100, duration: 1 }, "engineSection")
        .to(engineRef.current.position, { y: 0.1, duration: 1 }, "engineSection")
        .to(engineRef.current.rotation, { y: Math.PI * 2, duration: 2 })

        .to(engineRef.current.position, { y: -100, duration: 1 }, "carReturn")
        .to(modelRef.current.position, { y: -0.8, duration: 1 }, "carReturn")
        .to(modelRef.current.rotation, { y: Math.PI * 2, duration: 1 });
    });

    return () => ctx.revert();
  }, [modelRef, engineRef, setScrollProgress]);

  return null;
}

export default function App() {
  const modelRef = useRef();
  const engineRef = useRef();
  const scrollContainerRef = useRef();

  const [selectedCar, setSelectedCar] = useState(CARS[0]);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Кастомизация
  const [currentColor, setCurrentColor] = useState(COLORS[0].hex);
  const [currentRimColor, setCurrentRimColor] = useState(RIM_COLORS[0].hex);
  const [currentCaliperColor, setCurrentCaliperColor] = useState(CALIPER_COLORS[0].hex);
  const [envMode, setEnvMode] = useState(ENV_MODES[0]);
  const [lightsOn, setLightsOn] = useState(false);
  const [isEngineRunning, setIsEngineRunning] = useState(false);

  const handleEngineStart = () => {
    setIsEngineRunning(true);
    setLightsOn(true);
    playEngineSound();
    setTimeout(() => {
      setIsEngineRunning(false);
    }, 1500);
  };

  return (
    <div style={{ background: '#0a0a0c', color: '#fff', fontFamily: 'sans-serif', width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* Scroll Progress Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '4px',
        width: `${scrollProgress}%`,
        background: 'linear-gradient(90deg, #ff4b2b, #ff416c)',
        zIndex: 100, transition: 'width 0.1s ease-out'
      }} />

      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 20, left: '4%', right: '4%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10, backdropFilter: 'blur(16px)', background: 'rgba(20, 20, 25, 0.65)',
        padding: '12px 24px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)',
        gap: '10px', flexWrap: 'wrap'
      }}>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '1rem' }}>ASTON MARTIN SHOWROOM</div>
        
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '20px' }}>
          {CARS.map((car) => (
            <button
              key={car.id}
              onClick={() => setSelectedCar(car)}
              style={{
                padding: '6px 14px', borderRadius: '15px', border: 'none', cursor: 'pointer',
                background: selectedCar.id === car.id ? '#fff' : 'transparent',
                color: selectedCar.id === car.id ? '#000' : '#fff', fontWeight: 'bold', fontSize: '12px',
                transition: 'all 0.3s'
              }}
            >
              {car.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleEngineStart}
            style={{
              padding: '8px 16px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
              fontWeight: 'bold', border: 'none',
              background: isEngineRunning ? 'linear-gradient(90deg, #ff4b2b, #ff416c)' : 'rgba(255,255,255,0.15)',
              color: '#fff', boxShadow: isEngineRunning ? '0 0 15px rgba(255,65,108,0.8)' : 'none',
              transition: 'all 0.3s'
            }}
          >
            {isEngineRunning ? '🔥 V8 REVVING...' : '🔑 START ENGINE'}
          </button>

          <button 
            onClick={() => setLightsOn(!lightsOn)}
            style={{
              padding: '8px 16px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
              fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)',
              background: lightsOn ? '#fff' : 'rgba(255,255,255,0.1)', color: lightsOn ? '#000' : '#fff'
            }}
          >
            {lightsOn ? '💡 LIGHTS ON' : '💡 LIGHTS OFF'}
          </button>
        </div>
      </nav>

      {/* Extended Customizer Panel */}
      <div style={{
        position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)',
        zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'rgba(20,20,25,0.7)', padding: '14px 10px', borderRadius: '22px',
        backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Paint</div>
        {COLORS.map((c) => (
          <button
            key={c.hex}
            title={c.name}
            onClick={() => setCurrentColor(c.hex)}
            style={{
              width: '20px', height: '20px', borderRadius: '50%', background: c.hex,
              border: currentColor === c.hex ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer', transform: currentColor === c.hex ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.2s'
            }}
          />
        ))}

        <div style={{ width: '80%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />

        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Rims</div>
        {RIM_COLORS.map((r) => (
          <button
            key={r.hex}
            title={r.name}
            onClick={() => setCurrentRimColor(r.hex)}
            style={{
              width: '20px', height: '20px', borderRadius: '50%', background: r.hex,
              border: currentRimColor === r.hex ? '2px solid #ff416c' : '2px solid transparent',
              cursor: 'pointer', transform: currentRimColor === r.hex ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.2s'
            }}
          />
        ))}

        <div style={{ width: '80%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />

        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Brakes</div>
        {CALIPER_COLORS.map((cal) => (
          <button
            key={cal.hex}
            title={cal.name}
            onClick={() => setCurrentCaliperColor(cal.hex)}
            style={{
              width: '20px', height: '20px', borderRadius: '50%', background: cal.hex,
              border: currentCaliperColor === cal.hex ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer', transform: currentCaliperColor === cal.hex ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.2s'
            }}
          />
        ))}

        <div style={{ width: '80%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />

        <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Studio</div>
        {ENV_MODES.map((e) => (
          <button
            key={e.id}
            title={e.name}
            onClick={() => setEnvMode(e)}
            style={{
              padding: '3px 6px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '9px', fontWeight: 'bold',
              background: envMode.id === e.id ? '#fff' : 'rgba(255,255,255,0.1)',
              color: envMode.id === e.id ? '#000' : '#fff'
            }}
          >
            {e.name[0]}
          </button>
        ))}
      </div>

      {/* Control Hint */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '30px', zIndex: 10,
        background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '20px',
        fontSize: '12px', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', pointerEvents: 'none'
      }}>
        📜 Scroll to explore | 🖱 Drag LMB to rotate
      </div>

      {/* 3D Canvas Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
        <Canvas camera={{ position: [0, 1.2, 6.0], fov: 40 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={2.5} color={envMode.lightColor} />
          <directionalLight position={[-5, 4, -5]} intensity={1.5} color="#ff416c" />
          <pointLight position={[0, 3, 0]} intensity={1.5} color="#ffffff" />
          
          <Environment preset={envMode.preset} />

          {scrollContainerRef.current && (
            <OrbitControls 
              domElement={scrollContainerRef.current}
              enableZoom={false} 
              enablePan={false} 
              minPolarAngle={Math.PI / 4} 
              maxPolarAngle={Math.PI / 2.1} 
            />
          )}

          <Suspense fallback={<Loader />}>
            <Podium />

            <ContactShadows position={[0, -0.84, 0]} opacity={0.7} scale={10} blur={1.5} far={4} />

            <Float speed={0.8} rotationIntensity={0.01} floatIntensity={0.03}>
              <CarModel 
                key={selectedCar.id} 
                modelPath={selectedCar.modelPath} 
                scale={selectedCar.scale}
                currentColor={currentColor} 
                currentRimColor={currentRimColor}
                currentCaliperColor={currentCaliperColor}
                lightsOn={lightsOn} 
                modelRef={modelRef} 
                isEngineRunning={isEngineRunning}
              />
            </Float>

            <EngineModel engineRef={engineRef} />
          </Suspense>

          <ScrollAnimator modelRef={modelRef} engineRef={engineRef} setScrollProgress={setScrollProgress} />
        </Canvas>
      </div>

      {/* Scrollable Overlay Sections */}
      <div 
        ref={scrollContainerRef}
        className="scroll-container" 
        style={{ position: 'relative', zIndex: 2, height: '400vh' }}
      >
        <section style={sectionStyle}>
          <div style={textCardStyle}>
            <h1 style={{ fontSize: '3.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 900 }}>
              {selectedCar.name}
            </h1>
            <p style={{ color: '#aaa', fontSize: '1.2rem', marginTop: '12px', lineHeight: 1.5 }}>
              Next-generation interactive virtual showroom experience.
            </p>
          </div>
        </section>

        <section style={{ ...sectionStyle, justifyContent: 'flex-end' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '2rem', margin: 0, color: '#ff416c' }}>Aerodynamics</h2>
            <p style={{ color: '#ccc', marginTop: '12px', lineHeight: 1.6 }}>
              Sculpted to conquer the wind. Precision air channels deliver unmatched stability and downforce at peak speeds.
            </p>
          </div>
        </section>

        <section style={{ ...sectionStyle, justifyContent: 'flex-start' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '2rem', margin: 0, color: '#ff416c' }}>Heart of Power: V8 Engine</h2>
            <p style={{ color: '#ccc', marginTop: '12px', lineHeight: 1.6 }}>
              Handcrafted 4.0-liter Twin-Turbo V8 engine delivering raw exhilarating performance and a terrifying soundtrack.
            </p>
          </div>
        </section>

        <section style={{ ...sectionStyle, justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ ...cardStyle, maxWidth: '500px' }}>
            <h2 style={{ fontSize: '2.8rem', margin: 0 }}>Experience the Legend</h2>
            <p style={{ color: '#aaa', margin: '15px 0 30px' }}>Book your exclusive private test-drive session today.</p>
            <button style={buttonStyle}>
              Book Test Drive
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const sectionStyle = { 
  height: '100vh', 
  display: 'flex', 
  alignItems: 'center', 
  padding: '0 8%',
  boxSizing: 'border-box'
};

const textCardStyle = {
  maxWidth: '550px'
};

const cardStyle = { 
  maxWidth: '400px', 
  background: 'rgba(15, 15, 20, 0.75)', 
  padding: '35px', 
  borderRadius: '24px', 
  backdropFilter: 'blur(16px)', 
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
};

const buttonStyle = { 
  padding: '16px 40px', 
  fontSize: '1rem', 
  background: 'linear-gradient(90deg, #ff4b2b, #ff416c)', 
  color: '#fff', 
  border: 'none', 
  borderRadius: '30px', 
  cursor: 'pointer', 
  fontWeight: 'bold',
  boxShadow: '0 10px 25px rgba(255, 65, 108, 0.4)'
};