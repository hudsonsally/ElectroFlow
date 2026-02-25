import React, { useState } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { Product } from '../types';

interface WarehouseMapProps {
  inventory: Product[];
}

interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  categories: string[];
}

const ZONES: Zone[] = [
  { id: 'Zone-A', name: 'Zone A: Computing', x: 50, y: 50, width: 300, height: 200, categories: ['Laptops', 'Smartphones'] },
  { id: 'Zone-B', name: 'Zone B: Entertainment', x: 400, y: 50, width: 300, height: 200, categories: ['Audio', 'Gaming'] },
  { id: 'Zone-C', name: 'Zone C: Visuals', x: 50, y: 300, width: 300, height: 200, categories: ['Monitors', 'Cameras'] },
  { id: 'Zone-D', name: 'Zone D: Infrastructure', x: 400, y: 300, width: 300, height: 200, categories: ['Networking', 'Wearables'] },
];

export const WarehouseMap: React.FC<WarehouseMapProps> = ({ inventory }) => {
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getProductsInZone = (zone: Zone) => {
    return inventory.filter(p => zone.categories.includes(p.category));
  };

  const getZoneStatus = (zone: Zone) => {
    const products = getProductsInZone(zone);
    if (products.some(p => p.quantity <= p.min_threshold)) return 'low';
    if (products.length === 0) return 'empty';
    return 'healthy';
  };

  return (
    <div className="relative bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
      <Stage width={800} height={600} className="mx-auto cursor-crosshair">
        <Layer>
          {/* Warehouse Floor */}
          <Rect
            x={0}
            y={0}
            width={800}
            height={600}
            fill="#f8fafc"
          />

          {ZONES.map((zone) => {
            const status = getZoneStatus(zone);
            const products = getProductsInZone(zone);
            
            return (
              <Group key={zone.id}>
                {/* Zone Boundary */}
                <Rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  fill={status === 'low' ? '#fef2f2' : '#f0f9ff'}
                  stroke={status === 'low' ? '#fecaca' : '#bae6fd'}
                  strokeWidth={2}
                  cornerRadius={8}
                />
                
                {/* Zone Label */}
                <Text
                  x={zone.x + 10}
                  y={zone.y + 10}
                  text={zone.name}
                  fontSize={12}
                  fontStyle="bold"
                  fill="#64748b"
                />

                {/* Racks/Products in Zone */}
                {products.map((product, idx) => {
                  const rackWidth = 40;
                  const rackHeight = 60;
                  const padding = 15;
                  const cols = Math.floor((zone.width - 20) / (rackWidth + padding));
                  const px = zone.x + 15 + (idx % cols) * (rackWidth + padding);
                  const py = zone.y + 40 + Math.floor(idx / cols) * (rackHeight + padding);

                  const isLow = product.quantity <= product.min_threshold;

                  return (
                    <Group 
                      key={product.id}
                      onMouseEnter={(e) => {
                        setHoveredProduct(product);
                        const stage = e.target.getStage();
                        if (stage) {
                          const pos = stage.getPointerPosition();
                          if (pos) setMousePos(pos);
                        }
                      }}
                      onMouseLeave={() => setHoveredProduct(null)}
                      onMouseMove={(e) => {
                        const stage = e.target.getStage();
                        if (stage) {
                          const pos = stage.getPointerPosition();
                          if (pos) setMousePos(pos);
                        }
                      }}
                    >
                      <Rect
                        x={px}
                        y={py}
                        width={rackWidth}
                        height={rackHeight}
                        fill={isLow ? '#ef4444' : '#6366f1'}
                        cornerRadius={4}
                        shadowBlur={hoveredProduct?.id === product.id ? 10 : 0}
                        shadowColor="#000"
                        shadowOpacity={0.2}
                      />
                      <Text
                        x={px}
                        y={py + rackHeight + 5}
                        text={product.sku.split('-')[1]}
                        fontSize={10}
                        fill="#94a3b8"
                        width={rackWidth}
                        align="center"
                      />
                    </Group>
                  );
                })}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Tooltip */}
      {hoveredProduct && (
        <div 
          className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-slate-200 min-w-[180px]"
          style={{ 
            left: mousePos.x + 15, 
            top: mousePos.y + 15 
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{hoveredProduct.sku}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              hoveredProduct.quantity <= hoveredProduct.min_threshold ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
            )}>
              {hoveredProduct.quantity <= hoveredProduct.min_threshold ? 'Low Stock' : 'Healthy'}
            </span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm leading-tight">{hoveredProduct.name}</h4>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500">Current Stock:</span>
            <span className="text-sm font-bold text-slate-900">{hoveredProduct.quantity} units</span>
          </div>
          <div className="mt-1 flex justify-between items-center">
            <span className="text-xs text-slate-500">Location:</span>
            <span className="text-xs font-medium text-slate-700">{hoveredProduct.location} ({hoveredProduct.rack_number})</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex gap-4 bg-white/80 backdrop-blur-sm p-2 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
          <span className="text-slate-600">Healthy Stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span className="text-slate-600">Low Stock Alert</span>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
