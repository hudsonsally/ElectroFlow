import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Html, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Product } from '../types';

interface WarehouseMap3DProps {
  inventory: Product[];
  customZones?: any[];
}

const Rack = ({ 
  product, 
  position, 
  onHover 
}: { 
  product: Product; 
  position: [number, number, number]; 
  onHover: (p: Product | null) => void 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => {
    if (product.quantity <= product.min_threshold) return '#ef4444'; // Red
    if (product.quantity >= product.max_threshold * 0.8) return '#22c55e'; // Green
    return '#eab308'; // Yellow
  }, [product]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(product);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
        }}
      >
        <boxGeometry args={[1, 2, 0.5]} />
        <meshStandardMaterial 
          color={color} 
          emissive={hovered ? color : '#000'} 
          emissiveIntensity={hovered ? 0.5 : 0}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      
      {/* Rack Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.1, 2.1, 0.6]} />
        <meshStandardMaterial color="#334155" wireframe />
      </mesh>

      {/* Label on top */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.15}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
      >
        {product.sku.split('-')[1]}
      </Text>
    </group>
  );
};

const ZoneLabel = ({ name, position }: { name: string; position: [number, number, number] }) => (
  <Text
    position={position}
    rotation={[-Math.PI / 2, 0, 0]}
    fontSize={0.5}
    color="#94a3b8"
    font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
  >
    {name}
  </Text>
);

export const WarehouseMap3D: React.FC<WarehouseMap3DProps> = ({ inventory, customZones }) => {
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);

  const defaultZones = [
    { id: 'Zone-A', name: 'ZONE A: COMPUTING', categories: ['Laptops', 'Smartphones'], offset: [-6, 0, -4] },
    { id: 'Zone-B', name: 'ZONE B: ENTERTAINMENT', categories: ['Audio', 'Gaming'], offset: [6, 0, -4] },
    { id: 'Zone-C', name: 'ZONE C: VISUALS', categories: ['Monitors', 'Cameras'], offset: [-6, 0, 4] },
    { id: 'Zone-D', name: 'ZONE D: INFRASTRUCTURE', categories: ['Networking', 'Wearables'], offset: [6, 0, 4] },
  ];

  const zones = customZones || defaultZones;

  return (
    <div className="relative w-full h-[600px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={40} />
        <OrbitControls 
          enablePan={true} 
          maxPolarAngle={Math.PI / 2.1} 
          minDistance={5} 
          maxDistance={30}
          makeDefault
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>

        {/* Grid Helper */}
        <gridHelper args={[30, 30, '#1e293b', '#1e293b']} position={[0, 0, 0]} />

        {zones.map((zone) => {
          const products = inventory.filter(p => zone.categories.includes(p.category));
          return (
            <group key={zone.id}>
              <ZoneLabel name={zone.name} position={[zone.offset[0], 0.01, zone.offset[2] - 3]} />
              
              {/* Zone Boundary Glow */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.offset[0], 0.005, zone.offset[2]]}>
                <planeGeometry args={[10, 8]} />
                <meshStandardMaterial color="#312e81" transparent opacity={0.1} />
              </mesh>

              {products.map((product, idx) => {
                const cols = 4;
                const spacingX = 2;
                const spacingZ = 2;
                const x = zone.offset[0] - 3 + (idx % cols) * spacingX;
                const z = zone.offset[2] - 2 + Math.floor(idx / cols) * spacingZ;
                
                return (
                  <Rack 
                    key={product.id} 
                    product={product} 
                    position={[x, 1, z]} 
                    onHover={setHoveredProduct}
                  />
                );
              })}
            </group>
          );
        })}

        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={30} blur={2} far={4.5} />
        <Environment preset="city" />
      </Canvas>

      {/* 2D Overlay Tooltip */}
      {hoveredProduct && (
        <div className="absolute top-6 right-6 z-50 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">{hoveredProduct.sku}</span>
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              hoveredProduct.quantity <= hoveredProduct.min_threshold ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : 
              hoveredProduct.quantity >= hoveredProduct.max_threshold * 0.8 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
              "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            )} />
          </div>
          
          <h4 className="text-lg font-bold text-white leading-tight mb-1">{hoveredProduct.name}</h4>
          <p className="text-xs text-slate-400 mb-4">{hoveredProduct.category}</p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Current Stock</span>
              <span className={cn(
                "text-xl font-mono font-bold",
                hoveredProduct.quantity <= hoveredProduct.min_threshold ? "text-red-400" : 
                hoveredProduct.quantity >= hoveredProduct.max_threshold * 0.8 ? "text-emerald-400" : 
                "text-amber-400"
              )}>
                {hoveredProduct.quantity}
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  hoveredProduct.quantity <= hoveredProduct.min_threshold ? "bg-red-500" : 
                  hoveredProduct.quantity >= hoveredProduct.max_threshold * 0.8 ? "bg-emerald-500" : 
                  "bg-amber-500"
                )}
                style={{ width: `${Math.min(100, (hoveredProduct.quantity / hoveredProduct.max_threshold) * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                <span className="block text-[8px] text-slate-500 uppercase font-bold mb-1">Location</span>
                <span className="text-[10px] text-slate-300 font-medium">{hoveredProduct.location}</span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                <span className="block text-[8px] text-slate-500 uppercase font-bold mb-1">Rack ID</span>
                <span className="text-[10px] text-slate-300 font-medium">{hoveredProduct.rack_number}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl">
        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Status</h5>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <span className="text-[10px] text-slate-300 font-bold uppercase">Surplus (80%+)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-500 rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
          <span className="text-[10px] text-slate-300 font-bold uppercase">Medium Stock</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
          <span className="text-[10px] text-slate-300 font-bold uppercase">Low Stock Alert</span>
        </div>
      </div>

      {/* Controls Help */}
      <div className="absolute bottom-6 right-6 text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-4">
        <span>Left Click: Rotate</span>
        <span>Right Click: Pan</span>
        <span>Scroll: Zoom</span>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
