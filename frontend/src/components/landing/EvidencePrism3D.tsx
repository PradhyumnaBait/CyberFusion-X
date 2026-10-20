import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Lock,
  Network,
  Clock,
  Fingerprint,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export type ArtifactType = 'WORM_SEAL' | 'MULE_NODE' | 'TIMESTAMP_VERIFY';

interface ArtifactMeta {
  id: ArtifactType;
  label: string;
  tag: string;
  badgeColor: string;
  shortDesc: string;
  fullDesc: string;
  technicalCode: string;
  status: string;
}

const ARTIFACT_INFO: Record<ArtifactType, ArtifactMeta> = {
  WORM_SEAL: {
    id: 'WORM_SEAL',
    label: 'WORM Ingestion Seal',
    tag: 'CRYPTOGRAPHIC INTEGRITY',
    badgeColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-700/50',
    shortDesc: 'Dual SHA-256 + keyed BLAKE3 hash sealed at ingestion.',
    fullDesc:
      'Raw evidence files are committed immediately to an immutable Write-Once-Read-Many (WORM) ledger. Cryptographic digests prevent modification and provide RFC-3161 tamper verification.',
    technicalCode: 'SHA256: 8f4b1029c... · BLAKE3: 31a0e9f',
    status: 'SEALED & VERIFIED',
  },
  MULE_NODE: {
    id: 'MULE_NODE',
    label: 'Mule Account Node',
    tag: 'INCIDENT GRAPH TOPOLOGY',
    badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-700/50',
    shortDesc: 'High-betweenness mule account bridging fraud deposits.',
    fullDesc:
      'JGraphT 1.5.2 PageRank analysis flags this intermediary account with centrality 0.941. Dijkstra shortest-path reveals 3 hops connecting the initial UPI lure to cryptocurrency cash-out.',
    technicalCode: 'Centrality: 0.941 · 4 Correlated Links',
    status: 'FLAGGED INTERMEDIARY',
  },
  TIMESTAMP_VERIFY: {
    id: 'TIMESTAMP_VERIFY',
    label: 'Timestamp Verification',
    tag: 'TIMELINE INTEGRITY',
    badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-700/50',
    shortDesc: 'EXIF camera header matches visible OCR payment time.',
    fullDesc:
      'Cross-checks image EXIF metadata against extracted text stamps. Variance of <0.8s confirms authentic capture and rules out synthetic image forgery or altered receipt logs.',
    technicalCode: 'EXIF: 14:22:08 UTC · OCR: 14:22:08 UTC (Δ0.0s)',
    status: 'NO FORGERY DETECTED',
  },
};

/* =========================================================================
   1. Geometry Generator (Faceted Emerald-Cut Crystal)
   ========================================================================= */

function makeCrystalGeometry(): THREE.BufferGeometry {
  const w = 1.0, d = 0.78, c = 0.34; // half-width, half-depth, corner chamfer
  const s = new THREE.Shape();
  s.moveTo(-w + c, -d);
  s.lineTo(w - c, -d);
  s.lineTo(w, -d + c);
  s.lineTo(w, d - c);
  s.lineTo(w - c, d);
  s.lineTo(-w + c, d);
  s.lineTo(-w, d - c);
  s.lineTo(-w, -d + c);
  s.closePath();

  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(s, {
    depth: 1.7,
    bevelEnabled: true,
    bevelThickness: 0.28,
    bevelSize: 0.22,
    bevelSegments: 1,
    steps: 1,
  });

  g.rotateX(-Math.PI / 2);
  g.center();
  g = g.toNonIndexed();
  g.computeVertexNormals(); // FLAT facets, no smooth shading
  return g;
}

/* =========================================================================
   2. Procedural Studio Environment Hook (Produces Dispersion Rainbow Fringes)
   ========================================================================= */

function useStudioEnv() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const envScene = new THREE.Scene();
    const disposables: Array<{ dispose: () => void }> = [];

    // Dark BackSide sphere (radius 20, #05080f)
    const sphereGeo = new THREE.SphereGeometry(20, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x05080f,
      side: THREE.BackSide,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    envScene.add(sphere);
    disposables.push(sphereGeo, sphereMat);

    // Helper for thin high-intensity emissive strips
    const addStrip = (
      w: number,
      h: number,
      color: THREE.ColorRepresentation,
      k: number,
      pos: [number, number, number]
    ) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const c = new THREE.Color(color).multiplyScalar(k);
      const mat = new THREE.MeshBasicMaterial({
        color: c,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.lookAt(0, 0, 0);
      envScene.add(mesh);
      disposables.push(geo, mat);
    };

    // Glancing angle strips to produce vivid dispersion on chamfer facets:
    // tall white strip left (2×14, k=14)
    addStrip(1.5, 14, 0xffffff, 14, [-11, 2, 0]);
    // tall cyan strip right (1.2×14, k=10)
    addStrip(1.2, 14, 0x22d3ee, 10, [11, 1, 0]);
    // wide white strip overhead (14×1.5, k=12)
    addStrip(14, 1.5, 0xffffff, 12, [0, 12, -1]);
    // warm amber strip low front (10×1, k=6)
    addStrip(10, 0.8, 0xf59e0b, 6, [0, -6, 6]);
    // narrow cyan strip behind (k=16)
    addStrip(1.2, 14, 0x06b6d4, 16, [-4, 3, -9]);
    // narrow violet strip behind (k=10)
    addStrip(1.2, 12, 0xa855f7, 10, [4, 0, -9]);
    // second white strip high-left for rainbow brilliance on upper chamfers
    addStrip(2.0, 10, 0xffffff, 16, [-8, 9, -2]);
    // third white strip high-right for rainbow brilliance on upper chamfers
    addStrip(2.0, 10, 0xffffff, 16, [8, 9, -2]);

    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(envScene, 0);
    scene.environment = rt.texture;

    return () => {
      if (scene.environment === rt.texture) {
        scene.environment = null;
      }
      rt.dispose();
      pm.dispose();
      disposables.forEach((d) => d.dispose());
    };
  }, [gl, scene]);
}

/* =========================================================================
   3. Radial Background Hook (Dark Teal Center -> Midnight Blue Rim)
   ========================================================================= */

function useSceneBackground() {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(256, 256, 15, 256, 256, 360);
      grad.addColorStop(0, '#0e3a52');
      grad.addColorStop(0.55, '#07131f');
      grad.addColorStop(1, '#03060c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;

    return () => {
      if (scene.background === texture) {
        scene.background = null;
      }
      texture.dispose();
    };
  }, [scene]);
}

/* =========================================================================
   4. Floating Additive Dust Particles (Outside the Prism)
   ========================================================================= */

const DustParticles: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 140;

  const [geo] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 2.2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [geometry];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current || reducedMotion) return;
    const pos = pointsRef.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.12;
      if (arr[i * 3 + 1] > 2.4) {
        arr[i * 3 + 1] = -2.2;
      }
    }
    pos.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geo.dispose();
    };
  }, [geo]);

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        size={0.02}
        color="#7dd3fc"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

/* =========================================================================
   5. Opaque Internal Core (Solid Octahedron + Wireframe + Orbit Rings)
   ========================================================================= */

const InternalCore: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const coreRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);

  const solidGeo = useMemo(() => new THREE.OctahedronGeometry(0.48, 0), []);
  const wireGeo = useMemo(
    () => new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.62, 0)),
    []
  );
  const torusGeo = useMemo(() => new THREE.TorusGeometry(0.76, 0.008, 16, 64), []);
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.04, 12, 12), []);

  useEffect(() => {
    return () => {
      solidGeo.dispose();
      wireGeo.dispose();
      torusGeo.dispose();
      sphereGeo.dispose();
    };
  }, [solidGeo, wireGeo, torusGeo, sphereGeo]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (coreRef.current) {
      coreRef.current.rotation.y -= delta * 0.45;
      coreRef.current.rotation.z += delta * 0.25;
    }
    const t = state.clock.elapsedTime;
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.6;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.5;
    if (ring3Ref.current) ring3Ref.current.rotation.z = t * 0.7;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Cyan Point Light at core center */}
      <pointLight position={[0, 0, 0]} color="#38bdf8" intensity={12} distance={3.5} />

      {/* Counter-rotating Octahedron Core */}
      <group ref={coreRef}>
        <mesh geometry={solidGeo}>
          <meshStandardMaterial
            color="#0284c7"
            emissive="#38bdf8"
            emissiveIntensity={2.5}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
        <lineSegments geometry={wireGeo}>
          <lineBasicMaterial color="#38bdf8" linewidth={2} toneMapped={false} />
        </lineSegments>
      </group>

      {/* 3 Orbit Rings tilted 30, 60, 90 deg */}
      <group rotation={[Math.PI / 6, 0, 0]}>
        <mesh geometry={torusGeo}>
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
        <group ref={ring1Ref}>
          <mesh geometry={sphereGeo} position={[0.76, 0, 0]}>
            <meshBasicMaterial color="#38bdf8" toneMapped={false} />
          </mesh>
        </group>
      </group>

      <group rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <mesh geometry={torusGeo}>
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
        <group ref={ring2Ref}>
          <mesh geometry={sphereGeo} position={[0.76, 0, 0]}>
            <meshBasicMaterial color="#38bdf8" toneMapped={false} />
          </mesh>
        </group>
      </group>

      <group rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <mesh geometry={torusGeo}>
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
        <group ref={ring3Ref}>
          <mesh geometry={sphereGeo} position={[0.76, 0, 0]}>
            <meshBasicMaterial color="#38bdf8" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/* =========================================================================
   6. Curved Text Bands (Opaque Cylindrical Ribbon HUDs)
   ========================================================= */

function createTextBandTexture(label: string, sub: string, isHighlighted: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Solid dark navy panel #0a1a2c (opaque)
    ctx.fillStyle = isHighlighted ? '#0e243d' : '#0a1a2c';
    ctx.fillRect(0, 0, 768, 192);

    // Subtle background tech lines
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 48; x < 768; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, 180);
      ctx.stroke();
    }

    // 2px cyan border
    ctx.strokeStyle = isHighlighted ? '#38bdf8' : '#0891b2';
    ctx.lineWidth = isHighlighted ? 6 : 4;
    ctx.strokeRect(6, 6, 768 - 12, 192 - 12);

    // Corner decorative HUD ticks
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(6, 32); ctx.lineTo(6, 6); ctx.lineTo(32, 6);
    ctx.moveTo(768 - 32, 6); ctx.lineTo(768 - 6, 6); ctx.lineTo(768 - 6, 32);
    ctx.moveTo(6, 192 - 32); ctx.lineTo(6, 192 - 6); ctx.lineTo(32, 192 - 6);
    ctx.moveTo(768 - 32, 192 - 6); ctx.lineTo(768 - 6, 192 - 6); ctx.lineTo(768 - 6, 192 - 32);
    ctx.stroke();

    // Bold white uppercase label
    ctx.fillStyle = isHighlighted ? '#ffffff' : '#f0f9ff';
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 384, 76);

    // Small mono sub-line
    ctx.fillStyle = isHighlighted ? '#7dd3fc' : '#38bdf8';
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.fillText(sub, 384, 134);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BandMesh: React.FC<{
  label: string;
  sub: string;
  height: number;
  thetaStart: number;
  rotSpeed: number;
  isSelected: boolean;
  reducedMotion: boolean;
}> = ({ label, sub, height, thetaStart, rotSpeed, isSelected, reducedMotion }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(
    () => new THREE.CylinderGeometry(0.7, 0.7, 0.32, 40, 1, true, thetaStart, 1.1),
    [thetaStart]
  );
  const texture = useMemo(
    () => createTextBandTexture(label, sub, isSelected),
    [label, sub, isSelected]
  );

  useFrame((_, delta) => {
    if (!meshRef.current || reducedMotion) return;
    meshRef.current.rotation.y += delta * rotSpeed;
  });

  useEffect(() => {
    return () => {
      geo.dispose();
      texture.dispose();
    };
  }, [geo, texture]);

  const targetScale = isSelected ? 1.06 : 1.0;

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      position={[0, height, 0]}
      scale={[targetScale, targetScale, targetScale]}
    >
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};

const CurvedTextBands: React.FC<{
  selectedArtifact: ArtifactType;
  reducedMotion: boolean;
}> = ({ selectedArtifact, reducedMotion }) => {
  return (
    <group position={[0, 0, 0]}>
      {/* Top Left Band (+0.35): WORM INGESTION SEAL (thetaStart 3.3 to face front-left towards camera) */}
      <BandMesh
        label="WORM INGESTION SEAL"
        sub="IMMUTABLE LEDGER · RFC-3161"
        height={0.35}
        thetaStart={3.35}
        rotSpeed={0.06}
        isSelected={selectedArtifact === 'WORM_SEAL'}
        reducedMotion={reducedMotion}
      />

      {/* Top Right Band (+0.45): MULE ACCOUNT NODE (thetaStart 1.95 to face front-right towards camera) */}
      <BandMesh
        label="MULE ACCOUNT NODE"
        sub="PAGERANK 0.941 · 3-HOP DIJKSTRA"
        height={0.45}
        thetaStart={1.95}
        rotSpeed={-0.05}
        isSelected={selectedArtifact === 'MULE_NODE'}
        reducedMotion={reducedMotion}
      />

      {/* Bottom Right Band (-0.45): TIMESTAMP VERIFICATION (thetaStart 2.45 to face front towards camera) */}
      <BandMesh
        label="TIMESTAMP VERIFICATION"
        sub="EXIF METADATA · ΔT < 0.8s"
        height={-0.45}
        thetaStart={2.45}
        rotSpeed={0.07}
        isSelected={selectedArtifact === 'TIMESTAMP_VERIFY'}
        reducedMotion={reducedMotion}
      />
    </group>
  );
};

/* =========================================================================
   7. Equatorial Laser Ring, Halo Glow Disc & Vertical Sweep
   ========================================================================= */

function createEquatorGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 256;
    const cy = 256;
    const grad = ctx.createRadialGradient(cx, cy, 165, cx, cy, 255);
    grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
    grad.addColorStop(0.55, 'rgba(34, 211, 238, 0.65)');
    grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const LaserRing: React.FC<{
  sweepTrigger: number;
  reducedMotion: boolean;
}> = ({ sweepTrigger, reducedMotion }) => {
  const laserGroupRef = useRef<THREE.Group>(null);
  const sweepStartTimeRef = useRef<number>(-999);

  const mainTorusGeo = useMemo(() => new THREE.TorusGeometry(1.9, 0.015, 24, 80), []);
  const faintTorusGeo = useMemo(() => new THREE.TorusGeometry(1.95, 0.05, 24, 80), []);
  const discGeo = useMemo(() => new THREE.PlaneGeometry(4.4, 4.4), []);
  const glowTexture = useMemo(() => createEquatorGlowTexture(), []);

  useEffect(() => {
    return () => {
      mainTorusGeo.dispose();
      faintTorusGeo.dispose();
      discGeo.dispose();
      glowTexture.dispose();
    };
  }, [mainTorusGeo, faintTorusGeo, discGeo, glowTexture]);

  useEffect(() => {
    if (sweepTrigger > 0) {
      sweepStartTimeRef.current = performance.now() / 1000;
    }
  }, [sweepTrigger]);

  useFrame((state) => {
    if (!laserGroupRef.current) return;
    if (reducedMotion) {
      laserGroupRef.current.position.y = 0;
      return;
    }

    const now = performance.now() / 1000;
    const elapsed = now - sweepStartTimeRef.current;

    // Triggered Sweep: 200ms reset to y = -1.1, then 2.2s sweep to +1.1 and back to 0
    if (elapsed >= 0 && elapsed <= 2.4) {
      if (elapsed < 0.2) {
        const p = elapsed / 0.2;
        laserGroupRef.current.position.y = THREE.MathUtils.lerp(0, -1.1, p);
      } else {
        const sweepProgress = (elapsed - 0.2) / 2.2;
        if (sweepProgress <= 0.5) {
          const u = sweepProgress / 0.5;
          const ease = (1 - Math.cos(Math.PI * u)) / 2;
          laserGroupRef.current.position.y = -1.1 + 2.2 * ease;
        } else {
          const v = (sweepProgress - 0.5) / 0.5;
          const ease = (1 - Math.cos(Math.PI * v)) / 2;
          laserGroupRef.current.position.y = 1.1 - 1.1 * ease;
        }
      }
    } else {
      // Idle: gentle sine bob +-0.2 around y=0
      laserGroupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    }
  });

  return (
    <group ref={laserGroupRef} position={[0, 0, 0]}>
      {/* Primary Cyan Laser Ring (emissive cyan #22d3ee intensity 6) */}
      <mesh geometry={mainTorusGeo} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color={new THREE.Color('#22d3ee').multiplyScalar(6)}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Second Faint Torus (radius 1.95, tube 0.05, opacity 0.18) */}
      <mesh geometry={faintTorusGeo} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Flat Additive Radial-gradient Disc at Equator for Halo Flare */}
      <mesh geometry={discGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          map={glowTexture}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

/* =========================================================================
   8. Dark Glossy Pedestal Podium (Cylinder + Cyan Edge Rim + Concentric Rings)
   ========================================================================= */

const Podium: React.FC = () => {
  const cylinderGeo = useMemo(() => new THREE.CylinderGeometry(1.8, 2.1, 0.25, 64), []);
  const edgeTorusGeo = useMemo(() => new THREE.TorusGeometry(1.8, 0.012, 16, 64), []);
  const ring1Geo = useMemo(() => new THREE.RingGeometry(1.38, 1.40, 64), []);
  const ring2Geo = useMemo(() => new THREE.RingGeometry(0.98, 1.00, 64), []);

  useEffect(() => {
    return () => {
      cylinderGeo.dispose();
      edgeTorusGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
    };
  }, [cylinderGeo, edgeTorusGeo, ring1Geo, ring2Geo]);

  return (
    <group position={[0, -1.45, 0]}>
      {/* Dark Glossy Metallic Podium Body */}
      <mesh geometry={cylinderGeo}>
        <meshStandardMaterial
          color="#060b14"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>

      {/* Thin Cyan Emissive Ring on Top Edge */}
      <mesh geometry={edgeTorusGeo} position={[0, 0.125, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>

      {/* 2 Concentric Faint Ring Lines on Podium Top */}
      <mesh geometry={ring1Geo} position={[0, 0.126, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#0891b2" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={ring2Geo} position={[0, 0.126, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#0891b2" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/* =========================================================================
   9. Chunky Emerald-Cut Glass Crystal Body
   ========================================================================= */

const CrystalPrism: React.FC = () => {
  const crystalGeo = useMemo(() => makeCrystalGeometry(), []);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(crystalGeo, 15), [crystalGeo]);

  useEffect(() => {
    return () => {
      crystalGeo.dispose();
      edgesGeo.dispose();
    };
  }, [crystalGeo, edgesGeo]);

  return (
    <group position={[0, 0, 0]}>
      {/* Faceted Transmissive Glass Crystal */}
      <mesh geometry={crystalGeo}>
        <meshPhysicalMaterial
          color="#e6f6ff"
          transmission={1}
          thickness={1.8}
          ior={1.7}
          dispersion={0.4}
          roughness={0.03}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.03}
          attenuationColor="#7dd3fc"
          attenuationDistance={3}
          envMapIntensity={1.4}
          specularIntensity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Chamfered Facet Highlight Edges */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color="#bfeaff"
          transparent
          opacity={0.5}
        />
      </lineSegments>
    </group>
  );
};

/* =========================================================================
   10. Main Interactive 3D Stage Composition
   ========================================================================= */

interface PrismSceneProps {
  selectedArtifact: ArtifactType;
  sweepTrigger: number;
  reducedMotion: boolean;
  isDraggingRef: React.MutableRefObject<boolean>;
  targetRotRef: React.MutableRefObject<{ x: number; y: number }>;
}

const PrismScene: React.FC<PrismSceneProps> = ({
  selectedArtifact,
  sweepTrigger,
  reducedMotion,
  isDraggingRef,
  targetRotRef,
}) => {
  useStudioEnv();
  useSceneBackground();

  const crystalRotGroupRef = useRef<THREE.Group>(null);
  const currentRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useFrame((_, delta) => {
    if (!crystalRotGroupRef.current) return;

    if (!reducedMotion) {
      if (!isDraggingRef.current) {
        // Idle auto-rotate (0.25 rad/s)
        targetRotRef.current.y += delta * 0.25;
      }
    }

    // Smooth damped lerp interpolation
    currentRotRef.current.x = THREE.MathUtils.lerp(
      currentRotRef.current.x,
      targetRotRef.current.x,
      0.08
    );
    currentRotRef.current.y = THREE.MathUtils.lerp(
      currentRotRef.current.y,
      targetRotRef.current.y,
      0.08
    );

    crystalRotGroupRef.current.rotation.x = currentRotRef.current.x;
    crystalRotGroupRef.current.rotation.y = currentRotRef.current.y;
  });

  return (
    <>
      {/* Directed & Ambient Lighting */}
      <ambientLight intensity={0.4} color="#0b132b" />
      <directionalLight position={[4, 8, 4]} intensity={2.8} color="#ffffff" />
      <directionalLight position={[-4, -3, -4]} intensity={1.2} color="#0284c7" />

      {/* Drifting Additive Dust Points (Outside Prism) */}
      <DustParticles reducedMotion={reducedMotion} />

      {/* Rotating Crystal and Internal Opaque Structures */}
      <group ref={crystalRotGroupRef} position={[0, 0, 0]}>
        <InternalCore reducedMotion={reducedMotion} />
        <CurvedTextBands
          selectedArtifact={selectedArtifact}
          reducedMotion={reducedMotion}
        />
        <CrystalPrism />
      </group>

      {/* Equator Laser Ring (Sweeps vertically & bobs outside glass) */}
      <LaserRing sweepTrigger={sweepTrigger} reducedMotion={reducedMotion} />

      {/* Ground Pedestal Podium */}
      <Podium />
    </>
  );
};

/* =========================================================================
   11. Static CSS/SVG Fallback Component (WebGL unsupported / Context Lost)
   ========================================================================= */

interface FallbackProps {
  selectedArtifact: ArtifactType;
  onSelectArtifact: (type: ArtifactType) => void;
  isAuditing: boolean;
  onRunAudit: () => void;
}

export const EvidencePrismFallback: React.FC<FallbackProps> = ({
  selectedArtifact,
  onSelectArtifact,
  isAuditing,
  onRunAudit,
}) => {
  const meta = ARTIFACT_INFO[selectedArtifact];

  return (
    <div className="w-full h-full min-h-[440px] flex flex-col justify-between p-6 bg-gradient-to-b from-[#0e3a52]/40 via-[#07131f] to-[#03060c] border border-cyan-900/40 rounded-2xl text-slate-100">
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
            EVIDENCE PRISM · STATIC FORENSIC CADENCE
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
          STATIC MODE
        </span>
      </div>

      <div className="relative py-8 flex flex-col items-center justify-center">
        <svg
          className="w-56 h-56 text-cyan-400/80"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
        >
          {/* Emerald-cut Chamfered Hex Silhouette */}
          <polygon
            points="70,25 130,25 165,55 165,145 130,175 70,175 35,145 35,55"
            strokeWidth="2"
            className="text-cyan-400"
          />
          <polygon
            points="75,45 125,45 145,70 145,130 125,155 75,155 55,130 55,70"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            className="text-cyan-500/60"
          />
          {/* Wireframe Octahedron Core */}
          <polygon
            points="100,60 140,100 100,140 60,100"
            strokeWidth="1.5"
            className="text-cyan-300"
          />
          <line x1="100" y1="60" x2="100" y2="140" strokeWidth="1.5" stroke="#38bdf8" />
          <line x1="60" y1="100" x2="140" y2="100" strokeWidth="1.5" stroke="#38bdf8" />
          {/* Laser Equator Ring */}
          <ellipse cx="100" cy="100" rx="85" ry="16" strokeWidth="1.5" className="text-cyan-400 animate-pulse" />
        </svg>

        <div className="mt-4 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-mono">
          {meta.technicalCode}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">{meta.label}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${meta.badgeColor}`}>
            {meta.status}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {meta.fullDesc}
        </p>
      </div>
    </div>
  );
};

/* =========================================================================
   12. Exported Main EvidencePrism3D Component
   ========================================================================= */

interface EvidencePrism3DProps {
  onRunGlobalVerify: () => void;
  className?: string;
}

export const EvidencePrism3D: React.FC<EvidencePrism3DProps> = ({
  onRunGlobalVerify,
  className = '',
}) => {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType>('WORM_SEAL');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [sweepTrigger, setSweepTrigger] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // WebGL support, context loss, reduced motion, and IntersectionObserver
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      observer.disconnect();
    };
  }, []);

  // WebGL context lost recovery listener
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
    if ('transmissionResolutionScale' in gl) {
      // @ts-expect-error WebGLRenderer transmission resolution scale
      gl.transmissionResolutionScale = 0.75;
    }
    const dom = gl.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglSupported(false);
    };
    dom.addEventListener('webglcontextlost', onContextLost, false);
  }, []);

  // Drag-to-rotate pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    targetRotRef.current.y += dx * 0.008;
    targetRotRef.current.x = Math.max(
      -0.35,
      Math.min(0.35, targetRotRef.current.x + dy * 0.005)
    );
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Mode selection triggers laser sweep + text band highlight
  const handleSelectArtifact = (type: ArtifactType) => {
    setSelectedArtifact(type);
    setSweepTrigger((prev) => prev + 1);
  };

  // Integrity audit demonstration
  const handleAuditTrigger = () => {
    setIsAuditing(true);
    setSweepTrigger((prev) => prev + 1);
    setAuditMessage('Executing cryptographic verification across evidence vault...');

    try {
      onRunGlobalVerify();
    } catch (err) {
      console.error('Audit execution error:', err);
    }

    setTimeout(() => {
      setIsAuditing(false);
      setAuditMessage(
        'Verification request transmitted. Check system custody ledger for verification status.'
      );
      setTimeout(() => setAuditMessage(null), 4500);
    }, 2400);
  };

  const activeMeta = ARTIFACT_INFO[selectedArtifact];

  if (!webglSupported) {
    return (
      <EvidencePrismFallback
        selectedArtifact={selectedArtifact}
        onSelectArtifact={handleSelectArtifact}
        isAuditing={isAuditing}
        onRunAudit={handleAuditTrigger}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl bg-gradient-to-b from-[#101726] via-[#0b101b] to-[#060911] border border-[#233147] shadow-cfx-elevated overflow-hidden flex flex-col justify-between text-slate-100 ${className}`}
      style={{ minHeight: '440px' }}
    >
      {/* Subtle Top Cyan Accent Hairline */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

      {/* Stage Header */}
      <div className="relative z-10 px-5 pt-3.5 pb-2.5 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isAuditing ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-extrabold tracking-wider text-slate-200 uppercase">
              EVIDENCE PRISM · 3D FORENSIC CORE
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              SPECULAR EMERALD-CUT CRYSTAL · 60 FPS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-cyan-300">
            {activeMeta.tag}
          </span>
        </div>
      </div>

      {/* 3D WebGL Canvas Stage */}
      <div
        className="relative w-full h-[310px] sm:h-[330px] overflow-hidden select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Canvas
          camera={{ position: [0, 0.35, 5.2], fov: 36 }}
          dpr={[1, 1.75]}
          frameloop={isVisible ? 'always' : 'never'}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          onCreated={handleCreated}
          className="w-full h-full"
        >
          <PrismScene
            selectedArtifact={selectedArtifact}
            sweepTrigger={sweepTrigger}
            reducedMotion={reducedMotion}
            isDraggingRef={isDraggingRef}
            targetRotRef={targetRotRef}
          />
        </Canvas>

        {/* Ambient Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-radial-[circle_at_center,transparent_55%,rgba(6,9,17,0.75)_100%]" />
      </div>

      {/* HTML Artifact Selection Controls & Detail Panel */}
      <div className="relative z-10 px-4 sm:px-5 pb-4 space-y-2.5">
        {/* 3 Interactive Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {(['WORM_SEAL', 'MULE_NODE', 'TIMESTAMP_VERIFY'] as ArtifactType[]).map((type) => {
            const isSelected = selectedArtifact === type;
            const meta = ARTIFACT_INFO[type];
            return (
              <button
                key={type}
                onClick={() => handleSelectArtifact(type)}
                className={`px-2.5 py-1.5 rounded-xl text-left transition border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500/80 shadow-xs'
                    : 'bg-slate-900/60 hover:bg-slate-800/50 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {type === 'WORM_SEAL' && (
                    <Lock
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-cyan-400' : 'text-slate-500'
                      }`}
                    />
                  )}
                  {type === 'MULE_NODE' && (
                    <Network
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                  )}
                  {type === 'TIMESTAMP_VERIFY' && (
                    <Clock
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                  )}
                  <span
                    className={`text-[11px] font-bold truncate ${
                      isSelected ? 'text-slate-100' : 'text-slate-400'
                    }`}
                  >
                    {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Artifact Forensic Detail Panel */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-200">
              {activeMeta.technicalCode}
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activeMeta.badgeColor}`}
            >
              {activeMeta.status}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {activeMeta.fullDesc}
          </p>
        </div>

        {/* Audit Status / Action Feedback Message */}
        {auditMessage && (
          <div className="p-2.5 rounded-lg bg-cyan-950/50 border border-cyan-800/60 text-cyan-200 text-xs flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium text-[11px]">{auditMessage}</span>
          </div>
        )}

        {/* Stage Bottom Action Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive 3D Evidence Prism</span>
          </div>

          <button
            onClick={handleAuditTrigger}
            disabled={isAuditing}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing Vault...' : 'Test Hash Audit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvidencePrism3D;
