import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Label, Tag } from 'react-konva';
import { Product } from '../types';

interface WarehouseMapProps {
  inventory: Product[];
}

interface ZoneLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const ZONES: ZoneLayout[] = [
  { id: 'Zone-A1', name: 'Zone A1 (Laptops)', x: 50, y: 50, width: 120, height: 80, color: '#6366f1' },
  { id: 'Zone-A2', name: 'Zone A2 (Phones)', x: 180, y: 50, width: 120, height: 80, color: '#6366f1' },
  { id: 'Zone-A3', name: 'Zone A3 (Wearables)', x: 310, y: 50, width: 120, height: 80, color: '#6366f1' },
  
  { id: 'Zone-B1', name: 'Zone B1 (Audio)', x: 50, y: 150, width: 120, height: 80, color: '#8b5cf6' },
  { id: 'Zone-B2', name: 'Zone B2 (Gaming)', x: 180, y: 150, width: 120, height: 80, color: '#8b5cf6' },
  
  { id: 'Zone-C1', name: 'Zone C1 (Monitors)', x: 50, y: 250, width: 120, height: 80, color: '#ec4899' },
  { id: 'Zone-C2', name: 'Zone C2 (Cameras)', x: 180, y: 250, width: 120, height: 80, color: '#ec4899' },
  
  { id: 'Zone-D1', name: 'Zone D1 (Network)', x: 50, y: 350, width: 120, height: 80, color: '#10b981' },
];

export const WarehouseMap: React.FC<WarehouseMapProps> = ({ inventory }) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getZoneStock = (zoneId: string) => {
    return inventory.filter(p => p.location === zoneId);
  };

  const isLowStock = (zoneId: string) => {
    const stock = getZoneStock(zoneId);
    return stock.some(p => p.quantity <= p.min_threshold);
  };

  return (
    <div className="relative bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
      <Stage width={500} height={500}>
        <Layer>
          {/* Warehouse Floor */}
          <Rect
            x={0}
            y={0}
            width={500}
            height={500}
            fill="#f8fafc"
          />
          
          {/* Entrance Label */}
          <Text
            x={200}
            y={470}
            text="MAIN ENTRANCE"
            fontSize={12}
            fontStyle="bold"
            fill="#94a3b8"
            align="center"
            width={100}
          />

          {ZONES.map((zone) => {
            const stock = getZoneStock(zone.id);
            const lowStock = isLowStock(zone.id);
            const isHovered = hoveredZone === zone.id;

            return (
              <Group
                key={zone.id}
                onMouseEnter={(e) => {
                  setHoveredZone(zone.id);
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'pointer';
                }}
                onMouseMove={(e) => {
                  const pos = e.target.getStage()?.getPointerPosition();
                  if (pos) setTooltipPos(pos);
                }}
                onMouseLeave={(e) => {
                  setHoveredZone(null);
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'default';
                }}
              >
                {/* Zone Area */}
                <Rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  fill={zone.color}
                  opacity={isHovered ? 0.3 : 0.15}
                  stroke={lowStock ? '#f43f5e' : zone.color}
                  strokeWidth={lowStock ? 3 : 1}
                  cornerRadius={8}
                  dash={lowStock ? [5, 5] : undefined}
                />
                
                {/* Zone Label */}
                <Text
                  x={zone.x}
                  y={zone.y + 10}
                  width={zone.width}
                  text={zone.id}
                  fontSize={10}
                  fontStyle="bold"
                  fill="#475569"
                  align="center"
                />

                {/* Stock Count Indicator */}
                <Group x={zone.x + zone.width / 2} y={zone.y + zone.height / 2}>
                  <Rect
                    x={-15}
                    y={-10}
                    width={30}
                    height={20}
                    fill={lowStock ? '#f43f5e' : '#ffffff'}
                    cornerRadius={4}
                    shadowBlur={4}
                    shadowOpacity={0.1}
                  />
                  <Text
                    x={-15}
                    y={-5}
                    width={30}
                    text={stock.length.toString()}
                    fontSize={12}
                    fontStyle="bold"
                    fill={lowStock ? '#ffffff' : '#1e293b'}
                    align="center"
                  />
                </Group>

                {/* Pulsing Alert for Low Stock */}
                {lowStock && !isHovered && (
                  <Rect
                    x={zone.x - 2}
                    y={zone.y - 2}
                    width={zone.width + 4}
                    height={zone.height + 4}
                    stroke="#f43f5e"
                    strokeWidth={2}
                    cornerRadius={10}
                    opacity={0.5}
                  />
                )}
              </Group>
            );
          })}

          {/* Tooltip Layer */}
          {hoveredZone && (
            <Group x={tooltipPos.x + 10} y={tooltipPos.y + 10}>
              <Rect
                width={180}
                height={Math.max(40, getZoneStock(hoveredZone).length * 25 + 30)}
                fill="#1e293b"
                cornerRadius={8}
                opacity={0.95}
                shadowBlur={10}
                shadowOpacity={0.3}
              />
              <Text
                x={10}
                y={10}
                text={ZONES.find(z => z.id === hoveredZone)?.name || ''}
                fontSize={11}
                fontStyle="bold"
                fill="#94a3b8"
              />
              {getZoneStock(hoveredZone).map((p, i) => (
                <Group key={p.id} y={30 + i * 25}>
                  <Text
                    x={10}
                    text={p.name}
                    fontSize={10}
                    fill="#ffffff"
                    width={120}
                    wrap="none"
                    ellipsis={true}
                  />
                  <Text
                    x={130}
                    text={`Qty: ${p.quantity}`}
                    fontSize={10}
                    fontStyle="bold"
                    fill={p.quantity <= p.min_threshold ? '#fb7185' : '#34d399'}
                  />
                </Group>
              ))}
              {getZoneStock(hoveredZone).length === 0 && (
                <Text
                  x={10}
                  y={30}
                  text="No stock in this zone"
                  fontSize={10}
                  fontStyle="italic"
                  fill="#64748b"
                />
              )}
            </Group>
          )}
        </Layer>
      </Stage>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-[10px] space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-500 opacity-20 border border-indigo-500" />
          <span className="font-bold text-slate-600">Healthy Stock</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-500 opacity-20 border border-rose-500 border-dashed" />
          <span className="font-bold text-rose-600">Low Stock Alert</span>
        </div>
        <div className="pt-1 border-t border-slate-100 italic text-slate-400">
          Hover over zones for details
        </div>
      </div>
    </div>
  );
};
